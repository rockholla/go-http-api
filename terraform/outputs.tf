output "cluster_endpoint" {
  value       = "${module.cluster.endpoint}"
  description = "The EKS endpoint"
}

output "config_map_aws_auth" {
  value       = "${module.workers.config_map_aws_auth}"
  description = "The k8s ConfigMap to apply in the cluster to ensure nodes can join the cluster"
}
