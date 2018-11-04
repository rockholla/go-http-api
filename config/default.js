module.exports = {
  destroy: {
    enabled: true,
  },
  aws: {
    profile: "default",
    cluster: {
      size: {
        min: 2,
        max: 4,
        desired: 2,
      },
    },
  },
}
