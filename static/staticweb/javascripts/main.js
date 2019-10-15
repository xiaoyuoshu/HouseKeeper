function uint82str(array) {
    var out, i, len, c;
    var char2, char3;
    out = "";
    len = array.length;
    i = 0;
    while(i < len) {
        c = array[i++];
    switch(c >> 4) {
        case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
            // 0xxxxxxx
            out += String.fromCharCode(c);
            break;
        case 12: case 13:
            // 110x xxxx 10xx xxxx
            char2 = array[i++];
            out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
            break;
        case 14:
            // 1110 xxxx 10xx xxxx 10xx xxxx
            char2 = array[i++];
            char3 = array[i++];
            out += String.fromCharCode(((c & 0x0F) << 12) |
            ((char2 & 0x3F) << 6) |
            ((char3 & 0x3F) << 0));
            break;
        }
    }
    return out;
}

function newDate(days) {
	return moment().add(days, 'd').toDate();
}

function newDateString(days) {
	return moment().add(days, 'd').format(timeFormat);
}

function transformArrayBufferToBase64 (buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    for (var len = bytes.byteLength, i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function getImage_C(){
    $.ajax({
        url: '/image/devices/38723967/datastreams/image',
        type: 'get',
        data:{
            count: 5,
            account: 'whitenoise1'
        },
        headers: {
            'Content-Type': 'application/json',
            'api-key': 'S1iF7YEqm7z7tMT7FQln46BRrNI='
        },
        success: function (res) {
            console.log(res.errno);//0则无问题
            console.log(res.data.current_value.index);//image_url+'https://api.heclouds.com/bindata/'
            console.log(res.data.update_at);//时间戳
            if(res.errno==0){
                image_url = res.data.current_value.index;
                if(true){
                    fetch('/image/bindata/'+res.data.current_value.index,{
                        method: 'get',
                        headers: {
                            'Content-Type': 'application/json',
                            'api-key': 'S1iF7YEqm7z7tMT7FQln46BRrNI='
                        },
                        responseType: 'arraybuffer'
                    }).then(res => {
                        return res.arrayBuffer();
                    }).then(arraybuffer => {

                        $('#image_C').attr('src','data:image/png;base64,'+transformArrayBufferToBase64(arraybuffer));
                    });
                }
                window.image_C_time = res.data.update_at;
            }
        }
    });
}


layui.use(['element','table','layer'], function(){
    window.setInterval(getImage_C,2000);
    window.chartColors = {
        red: 'rgb(255, 99, 132)',
        orange: 'rgb(255, 159, 64)',
        yellow: 'rgb(255, 205, 86)',
        green: 'rgb(75, 192, 192)',
        blue: 'rgb(54, 162, 235)',
        purple: 'rgb(153, 102, 255)',
        grey: 'rgb(201, 203, 207)'
    };
    var chartYtype = 0;
    var table = layui.table;
    var form = layui.form;
    var Chartdata = [];
    var myChart = echarts.init(document.getElementById('Chart'));
    var realTimeX = [];
    realTimeX.unshift('现在')
    for(var i = 1;i < 90;i++){
        realTimeX.unshift(i*2+'s前')
    }
    option = {
        title: {
            text: '表格'
        },
        xAxis: {
            type: 'category',
            data: realTimeX
        },
        yAxis: {
            type: 'value',
            min: function(value) {
                return value.min - (value.max-value.min)*0.5;
            },
            max: function(value) {
                return value.max + (value.max-value.min)*0.5;
            }
        },
        tooltip: {
            trigger: 'axis',
            formatter: function (params) {
                console.log(params)
                return params[0].name + "：" + params[0].data
            },
            axisPointer: {
                animation: false
            }
        },
        series: [{
            data: Chartdata,
            type: 'line',
            smooth: true
        }],
        animation: false
    };
    myChart.setOption(option);
    //mqtt
    var userid = $('#userid').text()
    var client = mqtt.connect('wss://chuche.xyz/mqtt',{
        username: "admin",
        password: "admin"
    })
    client.subscribe('newOpLog/'+userid, {qos: 2})
    client.subscribe('realTimeData2Web/'+userid, {qos: 2})

    //mqtt消息处理
    client.on('message', function (topic, payload) {
        if(topic.indexOf('realTimeData2Web') != -1){
            //实时数据
            var data = JSON.parse(uint82str(payload));
            if(Chartdata.length>90){
                Chartdata.shift()
            }
            switch (chartYtype){
                case 0:Chartdata.push(data.tem);
                break;
                case 1:Chartdata.push(data.hum);
                break;
                case 2:Chartdata.push(data.smoke);
                break;
                case 3:Chartdata.push(data.illumination);
                break;
                case 4:Chartdata.push(data.co2);
                break;
            }
            myChart.setOption({
                series: [{
                    data: Chartdata
                }]
            });
            $('#now #tem').text(data.tem);
            $('#now #hum').text(data.hum);
            $('#now #illumination').text(data.illumination);
            $('#now #smoke').text(data.smoke);
            $('#now #co2').text(data.co2);
        }
        if(topic.indexOf('newOpLog') != -1){
            //新操作日志
            console.log(uint82str(payload))
            $('#newop').show()
        }
        if(topic.indexOf('newWrLog') != -1){
            //新危险日志
            console.log('newwr')
            $('#newwr').show()
        }
    })

    //注销按钮
    $('#logout').click(function () {
        console.log('logout')
        $.ajax({
            url: '/api/logout/',
            type: 'post',
            dataType: 'json',
            success: function (data) {
                if(data.success==1) window.location.href = '/login';
            }
        });
    })
    //操作日志
    $('#operating_log_btn').click(function () {
        $('#op_wr').text(1);
        $('#refresh_table').click();
    })
    //危险日志
    $('#warning_log_btn').click(function () {
        $('#op_wr').text(0);
        $('#refresh_table').click();
    })
    //刷新日志
    $('#refresh_table').click(function () {
        if ('1' === $('#op_wr').text()) {
            $('#newop').hide()
            table.render({
                elem: '#log_tbl'
                , height: 500
                , url: '/api/log/operating/' //数据接口
                , page: true //开启分页
                , cols: [[
                    {field: 'optime', title: '操作时间', width: 150}
                    , {field: 'optype', title: '操作类型', width: 150}
                    , {field: 'opremark', title: '备注'}
                ]]
                , done : function (res,curr,count) {
                    var all = $('[data-field=optime] div');
                    for(var t of all){
                        if(!('操作时间' === t.innerText)){
                            var begin_date = new Date(parseInt(t.innerText))
                            t.innerText = ((begin_date.getMonth()+1)
                                + "月"
                                +(begin_date.getDate()<10?('0'+begin_date.getDate()):(begin_date.getDate()))
                                +"日 "
                                +begin_date.getHours()
                                +':'
                                +(begin_date.getMinutes()<10?('0'+begin_date.getMinutes()):(begin_date.getMinutes()))
                                +':'
                                +(begin_date.getSeconds()<10?('0'+begin_date.getSeconds()):(begin_date.getSeconds()))
                            )
                        }
                    }
                }
            });
        } else {
            $('#newwr').hide()
            table.render({
                elem: '#log_tbl'
                , height: 500
                , url: '/api/log/warning/' //数据接口
                , page: true //开启分页
                , cols: [[
                    {field: 'wrtime', title: '发生时间', width: 150}
                    , {field: 'wrtype', title: '危险类型', width: 150}
                    , {field: 'wrremark', title: '备注'}
                ]]
                , done : function (res,curr,count) {
                    var all = $('[data-field=wrtime] div');
                    for(var t of all){
                        if(!('发生时间' === t.innerText)){
                            var begin_date = new Date(parseInt(t.innerText))
                            t.innerText = ((begin_date.getMonth()+1)
                                + "月"
                                +(begin_date.getDate()<10?('0'+begin_date.getDate()):(begin_date.getDate()))
                                +"日 "
                                +begin_date.getHours()
                                +':'
                                +(begin_date.getMinutes()<10?('0'+begin_date.getMinutes()):(begin_date.getMinutes()))
                                +':'
                                +(begin_date.getSeconds()<10?('0'+begin_date.getSeconds()):(begin_date.getSeconds()))
                            )
                        }
                    }
                }
            });
        }
    })
    $('#refresh_table').click();
    //控制空调
    form.on('submit(aircontrol)', function(data){
        var publishData = {
            userid: userid,
            tem: data.field.temperature,
            on: 'on' === data.field.airon?true:false
        };
        client.publish('controlAir/'+userid, JSON.stringify(publishData), {qos: 2})
        layer.msg('控制信息发送成功！', {
          icon: 1,
          time: 1000 //2秒关闭（如果不配置，默认是3秒）
        }, function(){
          //do something
        });
        return false;
    });
    //初始化图表
    $('#temChart').click(function () {
        chartYtype = 0;
        $.ajax({
            url: '/api/getDatabyNumber/',
            data: {
                count:90
            },
            type: 'get',
            dataType: 'json',
            success: function (data) {
                Chartdata = [];
                for(var i = 89;i>=0;i--){
                    Chartdata.push(data[i].tem);
                }
                myChart.setOption({
                    title: {
                        text: '温度'
                    },
                    series: [{
                        data: Chartdata
                    }]
                });
            }
        })
    })
    $('#humChart').click(function () {
        chartYtype = 1;
        $.ajax({
            url: '/api/getDatabyNumber/',
            data: {
                count:90
            },
            type: 'get',
            dataType: 'json',
            success: function (data) {
                Chartdata = [];
                for(var i = 89;i>=0;i--){
                    Chartdata.push(data[i].hum);
                }
                myChart.setOption({
                    title: {
                        text: '湿度'
                    },
                    series: [{
                        data: Chartdata
                    }]
                });
            }
        })
    })
    $('#smokeChart').click(function () {
        chartYtype = 2;
        $.ajax({
            url: '/api/getDatabyNumber/',
            data: {
                count:90
            },
            type: 'get',
            dataType: 'json',
            success: function (data) {
                Chartdata = [];
                for(var i = 89;i>=0;i--){
                    Chartdata.push(data[i].smoke);
                }
                myChart.setOption({
                    title: {
                        text: '烟雾浓度'
                    },
                    series: [{
                        data: Chartdata
                    }]
                });
            }
        })
    })
    $('#illuminationChart').click(function () {
        chartYtype = 3;
        $.ajax({
            url: '/api/getDatabyNumber/',
            data: {
                count:90
            },
            type: 'get',
            dataType: 'json',
            success: function (data) {
                Chartdata = [];
                for(var i = 89;i>=0;i--){
                    Chartdata.push(data[i].illumination);
                }
                myChart.setOption({
                    title: {
                        text: '光照强度'
                    },
                    series: [{
                        data: Chartdata
                    }]
                });
            }
        })
    })
    $('#co2Chart').click(function () {
        chartYtype = 4;
        $.ajax({
            url: '/api/getDatabyNumber/',
            data: {
                count:90
            },
            type: 'get',
            dataType: 'json',
            success: function (data) {
                Chartdata = [];
                for(var i = 89;i>=0;i--){
                    Chartdata.push(data[i].co2);
                }
                myChart.setOption({
                    title: {
                        text: '大气压强'
                    },
                    series: [{
                        data: Chartdata
                    }]
                });
            }
        })
    })
    $('#temChart').click();
    
    //查看可疑人员
    $('#show_catch_image').click(function () {
        $.ajax({
            url: '/image/devices/38723967/datastreams/image1',
            type: 'get',
            data:{
                count: 5,
                account: 'whitenoise1'
            },
            headers: {
                'Content-Type': 'application/json',
                'api-key': 'S1iF7YEqm7z7tMT7FQln46BRrNI='
            },
            success: function (res) {
                console.log(res.errno);//0则无问题
                if(res.errno==0){
                    image_url = res.data.current_value.index;
                    if(true){
                        fetch('/image/bindata/'+res.data.current_value.index,{
                            method: 'get',
                            headers: {
                                'Content-Type': 'application/json',
                                'api-key': 'S1iF7YEqm7z7tMT7FQln46BRrNI='
                            },
                            responseType: 'arraybuffer'
                        }).then(res => {
                            return res.arrayBuffer();
                        }).then(arraybuffer => {
                            layer.open({
                                type: 1,
                                title: '可疑人员捕捉',
                                offset: 'auto',
                                id: 'layerDemo' + 0,
                                content: '<img src="data:image/png;base64,'+transformArrayBufferToBase64(arraybuffer)+'" style="width: 100%;height: auto;"></img>',
                                btn: ['确认'],
                                btnAlign: 'c',
                                shade: 0,
                                yes: function(){
                                    layer.closeAll();
                                }
                            });
                        });
                    }
                }
            }
        });
    })
});
var timeFormat = 'MM/DD/YYYY HH:mm';

