<template>
  <div id="app">
    <input type="file" @change="fileAction">
  </div>
</template>
<script>
  import requests from './utils.js'
  export default {
    methods:{
      createChunks(file){
        const BYTES_PER_CHUNK = 1024 * 1024 * 30; // 定义切割单元1M
        const TOTLE_SIZE = file.size;  //文件的总大小
        let start = 0 // 每次上传的开始字节
        let partList = []
        while(start<TOTLE_SIZE){
          //根据长度截取每次需要上传的数据
          // File对象继承自Blob对象，因此包含slice方法
          let chunk = file.slice(start, start + BYTES_PER_CHUNK); // 每次上传的结尾字节
          partList.push({chunk,size:chunk.size})
          start+=BYTES_PER_CHUNK
        }
        return partList
      },
      calculateHash(partList){
        return new Promise((resolve, reject) => {
          let work = new Worker('/hash.js')
          work.postMessage({partList})
          work.onmessage = function (event) {
            let {percent,hash} = event.data
            console.log('percent---',percent,hash)
            if(hash){
              resolve(hash)
            }
          }
        })
      },
      async verify(filename){
        return await requests({
          url:`/verify/${filename}`
        })
      },
      async uploadParts(partList,filename){
        let {needUpload,uploadList} = await this.verify(filename)
        if(!needUpload){
          console.log('秒传成功')
          return
        }
        let reques = await this.createRequest(partList,filename)
        let v = await Promise.all(reques)
        await requests({
          url:`/merge/${filename}`
        })
      },
      createRequest(partList,filename){
        return partList.map((part)=>requests({
          url:`/upload/${filename}/${part.chunk_name}`, // 请求的URL地址
          method:'post',
          headers:{'Content-Type':'application/octet-stream'},// 置顶请求体的格式
          data:part.chunk //请求体
        }))
      },
      async fileAction(e){
        let file = e.target.files[0]
        console.log(file)
        // 分片上传
        let partList = this.createChunks(file)
        let filehash = await this.calculateHash(partList)
        let lastDotIndex = file.name.lastIndexOf('.')
        let extName = file.name.slice(lastDotIndex)
        let filename = `${filehash}${extName}`
        partList = partList.map(({chunk,size},index)=>({
          filename,
          chunk_name:`${filename}-${index}`,
          chunk,
          size:size
        }))
        this.uploadParts(partList,filename)
      }
    }
  }
</script>
<style lang="less">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>
