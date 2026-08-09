variable "project" {
  description = "Name prefix for every resource."
  type        = string
  default     = "ammunation"
}

variable "region" {
  description = "AWS region."
  type        = string
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "Postgres, Redis, Nest and nginx share this box, so t3.micro is too tight."
  type        = string
  default     = "t3.small"
}

variable "disk_gb" {
  description = "Root volume size. Holds the DB volume and uploaded documents."
  type        = number
  default     = 20
}

variable "key_name" {
  description = "Name of an existing EC2 key pair. Ansible SSHes in with its private half."
  type        = string
}

variable "ssh_cidr" {
  description = "Who may reach port 22. Set this to your own IP/32 — never 0.0.0.0/0."
  type        = string
}
