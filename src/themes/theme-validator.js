import Joi from 'joi'

const agentSchema = Joi.object({
  id: Joi.string().required().pattern(/^[a-z0-9-]+$/),
  name: Joi.string().required(),
  emoji: Joi.string().required(),
  description: Joi.string().required(),
  personality: Joi.object({
    traits: Joi.array().items(Joi.string()).required(),
    catchphrases: Joi.array().items(Joi.string()).required(),
    communication_style: Joi.string().required()
  }).required(),
  ports: Joi.object({
    backend: Joi.number().integer().min(1024).max(65535).required(),
    frontend: Joi.number().integer().min(1024).max(65535).required(),
    nginx: Joi.number().integer().min(1024).max(65535).required()
  }).required(),
  host: Joi.string().required()
})

const themeSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  version: Joi.string().default('1.0.0'),
  author: Joi.string().default('SoraOrc Team'),
  emoji: Joi.string().required(),
  colors: Joi.object({
    primary: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/),
    secondary: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/),
    accent: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/)
  }).default({
    primary: '#00ff00',
    secondary: '#000000',
    accent: '#ff0000'
  }),
  agents: Joi.array().items(agentSchema).min(1).required(),
  docker: Joi.object({
    network: Joi.string().required(),
    compose_template: Joi.string().default('standard')
  }).default({
    network: 'default-network',
    compose_template: 'standard'
  }),
  integrations: Joi.object({
    discord: Joi.boolean().default(true),
    github: Joi.boolean().default(true),
    docker: Joi.boolean().default(true)
  }).default({
    discord: true,
    github: true,
    docker: true
  }),
  defaultPortStart: Joi.number().integer().min(1024).max(65535)
})

export function validateTheme(themeData) {
  const { error, value } = themeSchema.validate(themeData, {
    abortEarly: false,
    stripUnknown: true
  })
  
  if (error) {
    const errors = error.details.map(d => d.message).join(', ')
    throw new Error(`Theme validation failed: ${errors}`)
  }
  
  // Generate docker network name if not provided
  if (!value.docker.network || value.docker.network === 'default-network') {
    value.docker.network = `${value.name.toLowerCase().replace(/\s+/g, '-')}-network`
  }
  
  // Set default port start if not provided
  if (!value.defaultPortStart) {
    value.defaultPortStart = value.agents[0]?.ports?.backend || 3011
  }
  
  return value
}