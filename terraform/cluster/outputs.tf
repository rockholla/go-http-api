output "endpoint" {
  value       = "${aws_eks_cluster.primary.endpoint}"
  description = "The EKS cluster endpoint"
}

output "certificate_authority_data" {
  value       = "${aws_eks_cluster.primary.certificate_authority.0.data}"
  description = "The EKS cluster certificate authority data"
}
