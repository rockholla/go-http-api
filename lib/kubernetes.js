const common = require('./common')

/**
 * Class for wrapping for interacting with the Kubernetes cluster, primarily via kubectl
 */
class Kubernetes {

  /**
   * @param {Aws} aws - Aws instance object
   * @param {string} cluster - name of the cluster
   */
  constructor (aws, cluster) {
    this.aws = aws
    common.exec(`aws --profile=${aws.profile} eks update-kubeconfig --name=${cluster}`)
  }

  /**
   * Run a kubectl apply
   * @param {string} path - the path to the yaml file to apply
   */
  apply (path) {
    const env = Object.assign(process.env, { AWS_PROFILE: this.aws.profile })
    common.exec(`kubectl apply -f ${path}`, { env: env })
  }

  /**
   * Run a kubectl destroy
   * @param {string} path - the path to the yaml file to apply
   */
  destroy (path) {
    const env = Object.assign(process.env, { AWS_PROFILE: this.aws.profile })
    common.exec(`kubectl destroy -f ${path}`, { env: env })
  }

  /**
   * Gets rollout status of a k8s object (deployment, daemonset,etc.)
   * @param {string} object - the name of the k8s object, e.g. ds/my-daemonset
   * @returns {string} the stdout of the rollout status command
   */
  getRolloutStatus (object) {
    const env = Object.assign(process.env, { AWS_PROFILE: this.aws.profile })
    return common.exec(`kubectl rollout status ${object}`, { env: env }).stdout.trim()
  }

  /**
   * Gets the endpoint for a given service
   * @param {string} name - name of the service
   */
  getServiceEndpoint (name) {
    const env = Object.assign(process.env, { AWS_PROFILE: this.aws.profile })
    return JSON.parse(common.exec(`kubectl get service/${name} -o json`, { env: env, silent: true }).stdout.trim()).status.loadBalancer.ingress[0].hostname
  }

}

module.exports = Kubernetes
