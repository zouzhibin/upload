self.importScripts('https://cdn.staticfile.org/spark-md5/3.0.0/spark-md5.js')
self.onmessage = async (event)=>{
    let {partList} = event.data
    const spark = new self.SparkMD5.ArrayBuffer()
    let percent = 0; // 总体计算hash的百分比
    let perSize = 100/partList.length // 没计算完一个part 相当于完成了百分之几25%
    let buffers = await Promise.all(partList.map(({chunk,size})=>new Promise((resolve, reject) =>{
        const reader = new FileReader()
        reader.readAsArrayBuffer(chunk)
        reader.onload = function (event) {
            percent+=perSize
            self.postMessage({percent:Number(percent.toFixed(2))})
            resolve(event.target.result)
        }
    })))
    // console.log('buffers',buffers)
    buffers.forEach(buffer=>spark.append(buffer))
    // 通知主进程，当前的哈希已经全部完成，并且把最终的hash值给主进程发过去
    self.postMessage({percent:100,hash:spark.end()})
    self.close()

}
