<template>
  <div id="app">
    <input type="file" @change="fileAction">
    <button @click="handlePause">暂停</button>
    <button @click="handleResume">恢复</button>
    <el-table
            :data="partList"
            style="width: 100%">
      <el-table-column
              prop="filename"
              label="切片名称"
              width="180">
      </el-table-column>
      <el-table-column
              prop="percent"
              label="进度"
              width="180">
        <template slot-scope="scope">
          <div>
            <el-progress :text-inside="true" :stroke-width="26" :percentage="Number(scope.row.percent)"></el-progress>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
<script>
  import requests from './utils.js'
  export default {
    data(){
      return{
        partList:[],
        filename:'',
        tableData:[]
      }
    },
    methods:{
      handlePause(){
        console.log(this.partList)
        this.partList.forEach(part=>part.xhr&&part.xhr.abort())
      },
      async handleResume(){
        console.log('this.partList',this.partList)
        await this.uploadParts(this.partList,this.filename)
      },
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
          partList.forEach(item=>{
            this.$set(item,'loaded',100)
            this.$set(item,'percent',100)
          })
          console.log('秒传成功')
          return
        }
        let reques = await this.createRequest(partList,uploadList,filename)
        let v = await Promise.all(reques)
        await requests({
          url:`/merge/${filename}`
        })
      },
      createRequest(partList,uploadList,filename){
         let filterPartList = partList.filter((part)=>{
          let uploadFile = uploadList.find(item=>item.filename===part.chunk_name)
           console.log('uploadFile===========',uploadFile)
          if(!uploadFile){
            this.$set(part,'loaded',0)
            this.$set(part,'percent',0)
            //part.loaded = 0 // 已经上传过的字节数
            //part.percent = 0 // 已经上传的百分比就是0 分片的上传过的百分比
            return true
          }
          if(uploadFile.size<part.chunk.size){
            this.$set(part,'loaded',Number(uploadList.size))
            this.$set(part,'percent', Number(Number(uploadList.size)/part.chunk.size*100).toFixed(2))
            //part.loaded = uploadList.size
            //part.percent = Number(part.loaded/part.chunk.size*100).toFixed(2)
            return true
          }
          return false
        })
        console.log('filterPartList',filterPartList)
        // this.partList = this.filterPartList
        console.log('filterPartList',filterPartList)
        return filterPartList.map((part)=>requests({
          url:`/upload/${filename}/${part.chunk_name}/${part.loaded}`, // 请求的URL地址
          method:'post',
          setXhr:(xhr)=>part.xhr= xhr,
          onProgress:(event)=>{
            this.$set(part,'percent',Number((part.loaded+event.loaded)/part.chunk.size*100).toFixed(2))
            //part.percent = Number((part.loaded+event.loaded)/part.chunk.size*100).toFixed(2)
          },
          headers:{'Content-Type':'application/octet-stream'},// 置顶请求体的格式
          data:part.chunk.slice(part.loaded) //请求体
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
        this.filename = filename
        partList = partList.map(({chunk,size},index)=>({
          filename,
          loaded:0,
          percent:0,
          chunk_name:`${filename}-${index}`,
          chunk,
          size:size
        }))
        this.partList = partList
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
