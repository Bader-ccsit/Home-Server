const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')

const API = 'http://localhost:4000'
const USER = 'Bader' // using username; storage.service now resolves id or username
const DEV = false // flip to use /storage/dev endpoints that accept x-username

async function list() {
  try {
  const url = DEV ? `${API}/storage/dev/list?path=` : `${API}/storage/list?path=`
  const headers = DEV ? { 'x-username': USER } : { 'x-user-id': USER }
  const res = await axios.get(url, { headers })
    console.log('LIST OK', res.data)
  } catch (e) {
    console.error('LIST ERROR', e.toString(), e.response && e.response.data)
  }
}

async function upload() {
  try {
  const form = new FormData()
  form.append('file', Buffer.from('hello from test script'), 'test.txt')
  const url = DEV ? `${API}/storage/dev/upload?path=` : `${API}/storage/upload?path=`
  const headers = Object.assign(DEV ? { 'x-username': USER } : { 'x-user-id': USER }, form.getHeaders())
  const res = await axios.post(url, form, { headers })
    console.log('UPLOAD OK', res.data)
  } catch (e) {
    console.error('UPLOAD ERROR', e.toString(), e.response && e.response.data)
  }
}

;(async () => {
  await list()
  await upload()
  await list()
})()
