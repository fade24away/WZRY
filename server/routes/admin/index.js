module.exports = app => {
  const express = require("express")
  const jwt = require('jsonwebtoken')
  // const assert = require('http-assert')
  const AdminUser = require('../../models/AdminUser')
  const router = express.Router({
    mergeParams: true
  })

  router.post('/', async(req, res) => {
    const model = await req.Model.create(req.body)
    res.send(model)
  })

  router.get('/', async(req, res) => {
    const queryOptions = {}
    if (req.Model.modelName === 'Category') {
      queryOptions.populate = 'parent'
    }
    const items = await req.Model.find().setOptions(queryOptions).limit(10)
    res.send(items)
  })

  router.get('/:id', async(req, res) => {
    const model = await req.Model.findById(req.params.id)
    res.send(model)
  })

  router.put('/:id', async(req, res) => {
    const model = await req.Model.findByIdAndUpdate(req.params.id, req.body)
    res.send(model)
  })

  router.delete('/:id', async(req, res) => {
    await req.Model.findByIdAndDelete(req.params.id, req.body)
    res.send({
      success: true
    })
  })

  // 登录校验中间件
  const auth = async (req, res, next) => {
    const token = String(req.headers.authorization || '').split(' ').pop()
    if(!token) {
      return res.status(401).send({
        message: '请先登录'
      })
    }
    const { id } = jwt.verify(token, app.get('secret'))
    if(!id) {
      return res.status(401).send({
        message: '请先登录'
      })
    }
    req.user = await AdminUser.findById(id)
    if(!req.user) {
      return res.status(401).send({
        message: '请先登录'
      })
    }
    await next()
  }

  app.use('/admin/api/rest/:resource', auth, async(req, res, next) => {
    const modelName = require('inflection').classify(req.params.resource)
    req.Model = require(`../../models/${modelName}`)
    next()
  }, router)

  const multer = require('multer')
  const upload = multer({ dest: __dirname + '/../../uploads' })
  app.post('/admin/api/upload', auth, upload.single('file'), async (req, res) => {
    const file = req.file
    file.url = `http://localhost:3000/uploads/${file.filename}`
    res.send(file)
  })

  app.post('/admin/api/login', async (req, res) => {
    const { username, password } = req.body
    const user = await AdminUser.findOne({username}).select('+password')
    if(!user) {
      return res.status(422).send({
        message: '用户不存在'
      })
    }
    if(password !== user.password) {
      return res.status(422).send({
        message: '密码错误'
      })
    }
    const token = jwt.sign({ id: user._id }, app.get('secret'))
    res.send({token})
  })
}