output "config_map_aws_auth" {
  value       = "${local.config_map_aws_auth}"
  description = "The k8s ConfigMap to apply in the cluster to ensure nodes can join the cluster"
}
