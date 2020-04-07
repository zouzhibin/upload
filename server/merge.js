let path = require('path')
let fs= require('fs-extra')
const DEFAULT_SIZE = 1024 * 1024 * 30; // 定义切割单元1M
const TEMP_DIR = path.resolve(__dirname,'temp')
const PUBLIC_DIR = path.resolve(__dirname,'public')

const pipeStream = (filePath,ws)=>new Promise(function(resolve){
    let rs = fs.createReadStream(filePath)
    rs.on('end',async ()=>{
        await fs.unlink(filePath)
        resolve()
    })
    rs.pipe(ws)
})

const mergeChunks = async (filename,size=DEFAULT_SIZE)=>{
    let chunkdir = path.resolve(TEMP_DIR,filename)

    let chunkFiles = await fs.readdir(chunkdir)
    console.log('chunkdir',chunkFiles)
    chunkFiles.sort((a,b)=>Number(a.split('-')[1]-Number(b.split('-'))[1]))
    let filepath = path.resolve(PUBLIC_DIR,filename)
    // console.log(filepath)
    // await Promise.all(chunkFiles.map((chunkFile,index)=>new Promise((resolve, reject) => {
    //     let chunksDir = path.resolve(TEMP_DIR,chunkFile) // 获取可读流文件的内容 写入可写流
    //     let rs = fs.createReadStream(chunksDir)
    //     let ws = fs.createWriteStream(filepath,{
    //         start:index*size
    //     })
    //     rs.on('end',function () {
    //         resolve()
    //     })
    //     rs.pipe(ws)
    // })))


    await Promise.all(chunkFiles.map((chunkFile,index)=>pipeStream(
        path.resolve(chunkdir,chunkFile),
        fs.createWriteStream(filepath,{
            start:index*size
        })
    )))


    console.log(chunkFiles)
}


// mergeChunks('5495b0e9358651d7de20d9fb54edc6ae.exe')

module.exports = {mergeChunks}
