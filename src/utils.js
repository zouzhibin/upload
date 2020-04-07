
export default function request(options){
    let defaultOptions = {
        method:'GET',
        baseURL:'http://localhost:8001',
        headers:{}, // 请求头
        data:{}, // 请求体
    }

    options = {...defaultOptions,...options,headers:{ ...defaultOptions.headers, ...options.headers}}

    return new Promise(function(resolve,reject){
        let xhr = new XMLHttpRequest()
        xhr.open(options.method,defaultOptions.baseURL + options.url)
        for(let key in options.headers){
            xhr.setRequestHeader(key,options.headers[key])
        }
        xhr.responseType = 'json'
        xhr.onreadystatechange = function(){
            if(xhr.readyState===4){
                if(xhr.status===200){
                    resolve(xhr.response)
                }else{
                 reject(xhr.response)
                }

            }
        }
        xhr.send(options.data)
    })
}
