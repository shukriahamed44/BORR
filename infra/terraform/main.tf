/*
 * One EC2 host in the default VPC, running the whole stack via docker compose.
 * Terraform builds the box; Ansible puts the app on it.
 *
 * ponytail: default VPC, no ALB, no RDS, no autoscaling. This is a single-instance
 * deployment on purpose — it is the smallest thing that actually serves the app.
 * Add a custom VPC + ALB + RDS when you need TLS termination, zero-downtime deploys,
 * or a database that survives the instance.
 */

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # ponytail: local state. Move to an S3 backend + DynamoDB lock the moment a second
  # person runs terraform, otherwise you will race each other's state file.
}

provider "aws" {
  region = var.region
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Canonical's official Ubuntu 24.04 image, resolved at plan time so we never pin a
# stale AMI id that does not exist in another region.
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

resource "aws_security_group" "app" {
  name        = "${var.project}-app"
  description = "HTTP from the world, SSH from the operator only"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH for Ansible"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Project = var.project }
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.app.id]

  root_block_device {
    volume_size = var.disk_gb
    volume_type = "gp3"
  }

  tags = { Name = "${var.project}-app", Project = var.project }
}

# Static address so re-running Ansible (and any DNS record) keeps working across reboots.
resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"
  tags     = { Project = var.project }
}

# Hand the address straight to Ansible — no copy-pasting IPs between tools.
resource "local_file" "ansible_inventory" {
  filename        = "${path.module}/../ansible/inventory.ini"
  file_permission = "0644"
  content         = <<-EOT
    [app]
    ${aws_eip.app.public_ip}

    [app:vars]
    ansible_user=ubuntu
    ansible_python_interpreter=/usr/bin/python3
  EOT
}
