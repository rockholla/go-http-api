output "cluster_group_id" {
  value       = "${aws_security_group.cluster.id}"
  description = "The ID of the security group for the cluster masters"
}

output "nodes_group_id" {
  value       = "${aws_security_group.nodes.id}"
  description = "The ID of the security group for the cluster worker nodes"
}
