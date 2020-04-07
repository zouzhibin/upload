let express = require('express')
let logger = require('morgan')
let {INTERNAL_SERVER_ERROR} = require('http-status-codes')
let createError = require('http-errors')
let cors = require('cors')
let path = require('path')
let fs = require('fs-extra')
let multiparty = require('multiparty')
let {mergeChunks} = require('./merge')
console.log(mergeChunks)
let app = express()
app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cors())
app.use(express.static(path.resolve(__dirname,'public')))
const TEMP_DIR = path.resolve(__dirname,'temp')
const PUBLIC_DIR = path.resolve(__dirname,'public')
app.post('/upload/:filname/:chunk_name',async function (req,res,next) {
    let {filname,chunk_name} = req.params;
    let chunk_dir = path.resolve(TEMP_DIR,filname)
    let extist = await fs.pathExists(chunk_dir)
    if(!extist){
        await fs.mkdir(chunk_dir)
    }
    let chunkFilePath = path.resolve(chunk_dir,chunk_name)
    let ws = fs.createWriteStream(chunkFilePath,{start:0,flags:'a'})
    req.on('end',()=>{
        console.log('触发了')
        ws.close()
        res.json({success:true,status: "1"})
    })
    req.pipe(ws)
})


app.get('/merge/:filename',async function (req,res,next) {
    let {filename} = req.params
    await mergeChunks(filename)
    return res.json({success: true})
})

app.get('/verify/:filename',async (req,res)=>{
    let { filename } = req.params;

    let filepath = path.resolve(PUBLIC_DIR,filename)
    let existFile = await fs.pathExists(filepath)
    console.log(filename,filepath,existFile,)
    if(existFile){
        return res.json({
            success:true,
            needUpload:false // 因为已经上传过了，所有不需要上传了，可以实现秒传的功能
        })
    }

    let tempDir = path.resolve(TEMP_DIR,filename)
    let exist = await fs.pathExists(tempDir)
    let uploadList = []
    if(exist){
        uploadList = await fs.readdir(tempDir)
        uploadList = await Promise.all(uploadList.map(async (filename)=>{
            let stat = await fs.stat(path.resolve(tempDir,filename))
            return {
                filename,
                size:stat.size
            }
        }))
    }
    return res.json({
        success:true,
        needUpload:true,
        uploadList // 已经上传的文件列表
    })

})



app.listen('8001',function (err) {
    if(err) throw err
    console.log('启动成功')
})


// app.post('/upload',async function (req,res,next) {
//     let form = new multiparty.Form()
//     form.parse(req,async(err,fields,files)=>{
//         if(err){
//             return next(err)
//         }
//         let filename = fields.filename[0]
//         let chunks = files.chunk[0]
//     })
// })
