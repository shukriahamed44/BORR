output "public_ip" {
  description = "Elastic IP of the app host."
  value       = aws_eip.app.public_ip
}

output "app_url" {
  value = "http://${aws_eip.app.public_ip}"
}

output "ssh" {
  value = "ssh ubuntu@${aws_eip.app.public_ip}"
}
