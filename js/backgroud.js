/**
 * @file 执行存储，遍历，生命周期最长的 JS
 * @author tanrich@foxmail.com
 */

var config = {
    getRoom: {
        "onlyFree": true,
        "t": +new Date()
    }
};

var timer;

function ajax(method) {
    var xhr = new XMLHttpRequest();
    method = method || 'GET';
    var formatQuery = function (obj) {
        var query = '';
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                query += k + '=' + obj[k] + '&';
            }
        }
        return query.slice(0, -1);
    };
    return function (options) {
        return new Promise(function (resolve, reject) {
            if (method.toUpperCase() === 'GET') {
                var url = options.url + '?' + formatQuery(options.data);
                xhr.open(method, url);
                xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
                xhr.send(null);
            } else if (method.toUpperCase() === 'POST') {
                xhr.open(method, options.url);
                // xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
                xhr.send(JSON.stringify(options.data));
            }
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(xhr);
                    }
                }
            }
        })
    }
}

/**
 * 获取popup窗口
 */
function getPopup() {
    return chrome.extension.getViews({type: 'popup'})[0].popup;
}

/**
 * 创建chrome通知
 */
function createInfo(options) {
    return chrome.notifications.create('', Object.assign({
        type: 'basic',
        iconUrl: 'icon.png',
        title: '配置信息保存成功',
        message: 'success'
    }, options));
}


var ajaxGet = ajax();
var ajaxPost = ajax('POST');

/**
 * 获取用户信息接口
 */
function getUserInfo() {
    return ajaxGet({
        url: api.getUserInfo,
        data: {
            t: +new Date()
        }
    }).then(function (res) {
        set({userInfo: res.data.entity}, function () {
            console.log('个人信息获取成功');
        });
        return res;
    }).catch(function (err) {
        console.log(err);
    })
}

/**
 * 获取建筑列表接口
 */
function getBuildingsAndAreas() {
    return ajaxGet({
        url: api.buildingsAndAreas,
        data: {
            t: +new Date()
        }
    })
        .then(function (res) {
            var list = res.data.list;
            var buildings = [];
            list.forEach(function (building) {
                buildings.push({
                    id: building.id,
                    name: building.name,
                    areaList: building.areaList
                        .map(function (area) {
                            return {
                                areaName: area.areaName,
                                id: area.id
                            }
                        })
                });
            });
            set({buildings: buildings}, function () {
                console.log('建筑列表存™储成功');
            });
            return res;
        })
        .catch(function (err) {
            console.log(err);
        });
}


// console.log(chrome.extension.getViews({type: 'popup'}).test);
// chrome.runtime.sendMessage({name:123},function(){

// })

/**
/**
 * 保存个性化配置
 * @param {Object} data 个性化配置
 */
function saveOption(data) {
    console.log(data)
    config.getRoom = data;
    set({config: config}, function () {
        createInfo({
            type: 'basic',
            iconUrl: 'icon.png',
            title: '配置信息保存成功',
            message: 'success'
        })
    });
}

/**
 * 停止获取房间
 */
function stopGetRoom() {
    clearTimeout(timer);
}

/**
 * 获取会议室接口
 */
function getRoom() {
    var data = config.getRoom;
    stopGetRoom();
    return getBookedRoom().then(function (conflict) {
        if (conflict.length) {
            var msg = '与' + conflict[0].startTimeStr + '在' + conflict[0].roomName + '的会议冲突';
            createInfo({
                type: 'basic',
                iconUrl: 'icon.png',
                title: '无法预订',
                message: msg
            });
            getPopup().stopGetRoom();
        } else {
            return ajaxPost({
                url: api.getRoom,
                data: config.getRoom
            })
                .then(function (res) {
                    if (res.data && res.data.entity && res.data.entity) {
                        var roomList = res.data.entity.roomList;
                        if (roomList.length > 0) {
                            var roomListItem = roomList[0];
                            bookRoom({
                                roomKey: roomListItem.id,
                                description: '预订房间',
                                peopleNum: 1,
                                startTime: data.startTime,
                                endTime: data.endTime,
                                t: +new Date()
                            })
                        } else {
                            timer = setTimeout(getRoom, 5 * 1000);
                        }
                    }
                })
                .catch(function (err) {
                    console.log(err);
                })
        }
    })
}

/**
 * 获取已经预订的房间
 */
function getBookedRoom() {
    return ajaxGet({
        url: api.getBookedRoom,
        data: {
            pageSize: 10,
            pageNumber: 1
        }
    })
        .then(function (res) {
            if (res.data && res.data.list) {
                var data = config.getRoom;
                var roomList = res.data.list;
                var conflict = [];
                roomList.forEach(function (roomListItem) {
                    if (!(
                        moment(data.startTime).diff(moment(roomListItem.startTime)) < 0
                            && moment(data.endTime).diff(moment(roomListItem.startTime)) <= 0
                        || moment(data.startTime).diff(moment(roomListItem.endTime)) >= 0
                            && moment(data.endTime).diff(moment(roomListItem.endTime)) > 0
                    )) {
                        conflict.push(roomListItem);
                    }
                });
                return conflict;
            }
        })
        .catch(function (err) {
            console.log(err);
        })
}

/**
 * 预订房间
 */
function bookRoom(data) {
    return ajaxPost({
        url: api.bookRoom,
        data: data
    })
        .then(function (res) {
            if (res.data && res.data.list && res.data.list.length) {
                getPopup().stopGetRoom();
                createInfo({
                    type: 'basic',
                    iconUrl: 'icon.png',
                    title: '恭喜已抢到会议室',
                    message: 'success'
                });
            }
        })
        .catch(function (err) {
            console.log(err);
        });
}

getUserInfo().then(getBuildingsAndAreas);
