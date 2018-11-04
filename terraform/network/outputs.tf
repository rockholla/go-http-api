output "vpc_id" {
  value       = "${aws_vpc.primary.id}"
  description = "The VPC ID"
}

output "subnet_ids" {
  value       = "${aws_subnet.primary.*.id}"
  description = "The VPC subnet IDs"
}
