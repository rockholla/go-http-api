const fs          = require('fs')
const path        = require('path')
const Aws         = require('lib/aws')
const Terraform   = require('lib/terraform')
const config      = require('@rockholla/clia').config
const logger      = require('@rockholla/clia').logger
const common      = require('lib/common')
const Kubernetes  = require('lib/kubernetes')

/**
 * Command for managing infrastructure
 */
class InfrastructureCommand {

  /**
   * Constructor that defines the command and description
   */
  constructor () {
    this.actions    = ['apply', 'destroy', 'status']
    this.command    = `infrastructure <${this.actions.join('|')}>`
    this.desc       = 'Manages all infrastructure for the Go HTTP API'

    this.clusterName        = 'go-http-api'
    this.aws                = null
    this.terraform          = null
    this.kubernetes         = null
    this.stateBucketPrefix  = 'go-http-api'
  }

  /**
   * Command entrypoint, primary handler
   * @param {Object} argv - yargs arguments
   */
  handler (argv) {
    this.aws        = new Aws(config.active.aws.profile)
    this.terraform  = new Terraform(this.aws)
    this[common.getArgvCommand(argv, this.actions)](argv).then(() => {}).catch((error) => {
      common.processError(error, argv)
    })
  }

  /**
   * Constructs and returns common terraform args for infrastructure terraform commands
   * @returns {string} var args formatted for cli terraform
   */
  getTerraformArgs () {
    return this.terraform.makeVarArgs({
      cluster_name: this.clusterName,
      cluster_min_size: config.active.aws.cluster.size.min,
      cluster_max_size: config.active.aws.cluster.size.max,
      cluster_desired_size: config.active.aws.cluster.size.desired,
      cluster_node_instance_type: config.active.aws.cluster.node.type,
    })
  }

  /**
   * Creates/updates infrastructure
   * @param {Object} argv - yargs arguments
   * @returns {Promise} promise result
   */
  apply (argv) {
    return common.protectAction('infrastructure', 'apply', argv).then(() => {
      logger.info('Creating/updating Go HTTP API infrastructure')
      return this.terraform.execute(`apply ${this.getTerraformArgs()}`, path.resolve(__dirname, '..', 'terraform'), this.stateBucketPrefix)
    }).then((result) => {
      this.kubernetes   = new Kubernetes(this.aws, this.clusterName)
      const yamlPath    = path.resolve(__dirname, '..', 'terraform', '.tmp', 'config_map_aws_auth.yml')
      fs.writeFileSync(yamlPath, result.outputs.config_map_aws_auth.value)
      this.kubernetes.apply(yamlPath)
    })
  }

  /**
   * Destroys the infrastructure
   * @param {Object} argv - yargs arguments
   * @returns {Promise} promise result
   */
  destroy (argv) {
    return common.protectAction('infrastructure', 'destroy', argv).then(() => {
      logger.info('Destroying Go HTTP API infrastructure')
      this.kubernetes = new Kubernetes(this.aws, this.clusterName)
      this.kubernetes.destroy(path.resolve(__dirname, '..', 'build', 'kubernetes', 'service.yml'))
      return this.terraform.execute(`destroy ${this.getTerraformArgs()}`, path.resolve(__dirname, '..', 'terraform'), this.stateBucketPrefix)
    }).then(() => {
      logger.warn(`The following AWS resources are not destroyed automatically and will need to be removed manually if needed:\n\n` +
                  `  * ECR Repository "go-http-api" and images in region ${this.aws.region}\n` +
                  `  * The S3 state bucket named "go-http-api-${this.aws.accountId}" in region ${this.aws.region}`)
    })
  }

  /**
   * Gets the status of the infrastructure
   * @returns {Promise} promise result
   */
  status () {
    logger.info('Getting the status of the Go HTTP API infrastructure')
    return this.terraform.execute('show', path.resolve(__dirname, '..', 'terraform'), this.stateBucketPrefix)
  }

}

const command = new InfrastructureCommand()
module.exports = {
  command: command.command,
  desc: command.desc,
  handler: argv => {
    command.handler(argv)
  }
}
