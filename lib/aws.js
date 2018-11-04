const AwsSdk  = require('aws-sdk')
const common  = require('./common')

/**
 * AWS library
 */
class Aws {

  /**
   * Constructor
   * @param {string} profile - the named AWS profile
   */
  constructor (profile) {
    this.profile    = profile
    this.region     = common.exec(`aws --profile=${profile} configure get region`, { silent: true }).stdout.trim()
    this.accountId  = common.exec(`aws --profile=${profile} sts get-caller-identity --output text --query 'Account'`, { silent: true }).stdout.trim()
    AwsSdk.config.credentials = new AwsSdk.SharedIniFileCredentials({ profile: profile })
    AwsSdk.config.update({ region: this.region })
  }

  /**
   * Gets credential values based on the named profile
   * @returns {Object} credentials
   * @returns {Object} credentials.accessKeyId
   * @returns {Object} credentials.secretAccessKey
   */
  getCredentials () {
    return {
      accessKeyId: common.exec(`aws --profile=${this.profile} configure get aws_access_key_id`, { silent: true }).stdout.trim(),
      secretAccessKey: common.exec(`aws --profile=${this.profile} configure get aws_secret_access_key`, { silent: true }).stdout.trim()
    }
  }

  /**
   * Ensures that a bucket with the given name exists
   * @param {string} name - the bucket name
   */
  ensureS3Bucket (name) {
    const s3 = new AwsSdk.S3()
    return new Promise((resolve, reject) => {
      s3.headBucket({ Bucket: name }, (err, data) => {
        if (err) {
          if (err.code && err.code === 'NotFound') {
            const createArgs = {
              Bucket: name,
              CreateBucketConfiguration: {
                LocationConstraint: this.region,
              },
            }
            s3.createBucket(createArgs, (err, data) => {
              if (err) return reject(err)
              return resolve(data)
            })
          } else {
            return reject(err)
          }
        }
        return resolve(data)
      })
    })
  }

  /**
   * Ensures an ECR repository with a given name
   * @param {string} name - the bucket name
   */
  ensureEcrRepository (name) {
    const ecr = new AwsSdk.ECR()
    return new Promise((resolve, reject) => {
      ecr.describeRepositories({ repositoryNames: [ name ] }, (err, data) => {
        if (err.code === 'RepositoryNotFoundException') {
          ecr.createRepository({ repositoryName: name}, (err, data) => {
            if (err) return reject(err)
            return resolve(data)
          })
        } else if (err) {
          return reject(err)
        } else {
          return resolve(data)
        }
      })
    })
  }

  /**
   * Uses the cli to log in to ECR for docker
   */
  loginToEcr () {
    const cmd = common.exec(`aws --profile=${this.profile} ecr get-login --no-include-email`, { silent: true }).stdout.trim()
    common.exec(cmd)
  }

}

module.exports = Aws
