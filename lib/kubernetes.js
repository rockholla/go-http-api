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
   * Waits for a k8s object rollout to complete
   * @param {string} object - the name of the k8s object, e.g. ds/my-daemonset
   * @returns {Promise} on success, resolves to the stdout of the rollout status command
   */
  async waitForRolloutComplete (object) {
    const env       = Object.assign(process.env, { AWS_PROFILE: this.aws.profile })
    const cmd       = `kubectl rollout status ${object}`
    let result      = common.exec(cmd, { env: env }, false).stdout.trim()
    let attempts    = 0
    let maxAttempts = 12 // 1 minute
    while (attempts < maxAttempts && !result.match(/successfully rolled out/g)) {
      await common.sleep(5)
      result = common.exec(cmd, { env: env }, false).stdout.trim()
      attempts++
      if (attempts >= maxAttempts) return Promise.reject('Timed out waiting for rollout to complete')
    }
    return Promise.resolve(result)
  }

  /**
   * Waits for a k8s service endpoint to become available
   * @param {string} name - the name of the k8s service
   * @returns {Promise} on success, resolves to the the ingress endpoint
   */
  async waitForServiceEndpoint (name) {
    const parse = (input) => {
      let parsed = {}
      try {
        parsed = JSON.parse(input)
      } catch (error) {
        parsed = {}
      }
      return parsed
    }
    const env       = Object.assign(process.env, { AWS_PROFILE: this.aws.profile })
    const cmd       = `kubectl get service/${name} -o json`
    let result      = parse(common.exec(cmd, { env: env, silent: true }, false).stdout.trim())
    let attempts    = 0
    let maxAttempts = 12 // 1 minute
    while (attempts < maxAttempts &&
           (!result.status || !result.status.loadBalancer || !(result.status.loadBalancer.ingress instanceof Array) || !result.status.loadBalancer.ingress[0].hostname)) {
      await common.sleep(5)
      result = parse(common.exec(cmd, { env: env, silent: true }, false).stdout.trim())
      attempts++
      if (attempts >= maxAttempts) return Promise.reject('Timed out waiting for service endpoint')
    }
    return Promise.resolve(result.status.loadBalancer.ingress[0].hostname)
  }

}

module.exports = Kubernetes
