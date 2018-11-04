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

}

module.exports = Kubernetes
