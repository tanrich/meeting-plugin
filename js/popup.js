/**
 * @file 弹窗页面主函数
 * @author tanrich@foxmail.com
 */

var defaultConf = {
    roomType: false,
    startTime: moment().format('YYYY-MM-DD 08:00:00'),
    endTime: moment().format('YYYY-MM-DD 20:00:00'),
};

function Popup() {
    this.buildings = [];
    this.buildingId = 0;
    this.areaId = 0;
    this.roomType = '';
    this.roomSize = '';
    this.startTime = '';
    this.endTime = '';
    this.buildingSelect = getDom('#building-select');
    this.areaSelelct = getDom('#area-select');
    this.roomTypeSelect = getDom('#room-type');
    this.roomSizeSelect = getDom('#room-size');
    this.saveOption = getDom('#save-option');
    this.startOption = getDom('#start-option');
    this.background = chrome.extension.getBackgroundPage();
    this.startLaydate = startLaydate.bind(this);
    this.endLayDate = endLayDate.bind(this);

    this.init();
    this.bindEvents();
}

/**
 * 初始化函数 遍历 data 以支持响应式
 */
Popup.prototype.init = function () {
    this.observeData();
};

/**
 * 创建建筑物下拉选项
 */
Popup.prototype.createBuildingSelection = function () {
    this.buildingSelect.innerHTML = this.buildings
        .map(function (build) {
            return ''
                + '<option value="'
                + build.id
                + '">'
                + build.name
                + '</option>'
        }).join('\n');
};

/**
 * 创建楼层下拉选项
 * @param {object} building 楼层列表
 */
Popup.prototype.createAreaSelection = function (building) {
    this.areaSelelct.innerHTML = [{
        id: '',
        areaName: '全部'
    }].concat(building.areaList)
        .map(function (floor) {
            return ''
                + '<option value="'
                + floor.id
                + '">'
                + floor.areaName
                + '</option>'
        }).join('\n');
};

/**
 * 获取对应建筑物楼层列表
 */
Popup.prototype.getBuildingToFloor = function () {
    for (var i = 0, len = this.buildings.length; i < len; i++) {
        if (this.buildings[i].id === this.buildingId) {
            return this.buildings[i];
        }
    }
    return false;
};

/**
 * 事件绑定
 */
Popup.prototype.bindEvents = function () {
    /**
     * 建筑下拉框事件监听
     */
    this.buildingSelect.addEventListener('change', function (e) {
        this.buildingId = +e.target.value;
    }.bind(this));

    /**
     * 楼层下拉框事件监听
     */
    this.areaSelelct.addEventListener('change', function (e) {
        this.areaId = e.target.value === '' ? null : +e.target.value;
    }.bind(this));

    /**
     * 会议室类型下拉框事件监听
     */
    this.roomSizeSelect.addEventListener('change', function (e) {
        this.roomSize =  e.target.value === '' ? null : e.target.value;
    }.bind(this));

    /**
     * 保存配置事件监听
     */
    this.startOption.addEventListener('click', function (e) {
        e.preventDefault();
        var _self = e.target;
        if (_self.getAttribute('class') === 'btn-actived') {
            this.stopGetRoom();
        } else {
            _self.innerText = '寻找中...点击停止';
            _self.setAttribute('class', 'btn-actived');
            this.saveOption.click();
            this.background.getRoom();
        }
    }.bind(this));

    this.saveOption.addEventListener('click', function (e) {
        e.preventDefault();
        var data = this.forMatFormData();
        this.background.saveOption(data);
    }.bind(this));
};

/**
 * 格式化表单信息
 */
Popup.prototype.forMatFormData = function () {
    return {
        buildingId: this.buildingId,
        areaId: this.areaId,
        isTrainRoom: this.roomType === '' ? null : this.roomType,
        capacity: this.roomSize === '' ? null : this.roomSize,
        startTime: this.startTime,
        endTime: this.endTime,
        onlyFree: true,
        t: +new Date()
    }
};

Popup.prototype.start = function () {
    get(['buildings', 'userInfo', 'config'], function (data) {
        var userInfo = data.userInfo;
        var getRoom = data.config && data.config.getRoom || {};
        this.buildings = data.buildings;
        this.buildingId = getRoom.buildingId || userInfo.area.mrbsBuildingId;
        this.areaId = getRoom.areaId || userInfo.area.id;
        this.roomType = getRoom.isTrainRoom || defaultConf.roomType;
        this.roomSize = getRoom.capacity || this.roomSize;
        this.startTime = getRoom.startTime || defaultConf.startTime;
        this.endTime = getRoom.endTime || defaultConf.endTime;
    }.bind(this));
};

Popup.prototype.stopGetRoom = function () {
    this.startOption.innerText = '开始抢会议室';
    this.startOption.setAttribute('class', '');
    this.background.stopGetRoom();
};

/**
 * 遍历 data 支持响应式
 */
Popup.prototype.observeData = function () {
    for (var key in this) {
        if (this.hasOwnProperty(key)) {
            this.observeCore(this, key, this.getAfterSet(key));
        }
    }
};

/**
 * 响应式核心函数
 */
Popup.prototype.observeCore = function (obj, key, afterSet) {
    var oldVal = obj[key];
    var that = this;
    Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        get: function () {
            return oldVal;
        },
        set: function (newVal) {
            if (newVal !== oldVal) {
                oldVal = newVal;
                afterSet && afterSet.call(that, newVal);
            }
        }
    })
};

/**
 * 获取对应 key 的后置函数
 * @params {string} key 参数名
 */
Popup.prototype.getAfterSet = function (key) {
    var afterSet;
    switch (key) {
        case 'buildings': {
            afterSet = function () {
                this.createBuildingSelection();
            };
            break;
        }
        case 'buildingId': {
            afterSet = function (buildingId) {
                this.createAreaSelection(this.getBuildingToFloor());
                this.buildingSelect.value = buildingId;
            };
            break;
        }
        case 'areaId': {
            afterSet = function (areaId) {
                this.areaSelelct.value = areaId;
            };
            break;
        }
        case 'roomType': {
            afterSet = function (roomType) {
                this.roomTypeSelect.value = roomType === null ? '' : roomType;
            };
            break;
        }
        case 'roomSize': {
            afterSet = function (roomSize) {
                this.roomSizeSelect.value = roomSize === null ? '' : roomSize;
            };
            break;
        }
        case 'startTime': {
            afterSet = function (startTime) {
                this.startLaydate({value: startTime})
            };
            break;
        }
        case 'endTime': {
            afterSet = function (endTime) {
                this.endLayDate({value: endTime});
            };
            break;
        }
    }
    return afterSet;
};

function renderLaydate(base, done) {
    base = typeof base === 'string' ? {elem: base} : base;
    return function (options) {
        return laydate.render({
            elem: base.elem,
            type: 'datetime',
            value: options.value,
            done: done.bind(this)
        });
    }
}

var startLaydate = renderLaydate('#start-time', function (value, date) {
    this.startTime = value;
    var diffTime = moment(this.startTime).diff(moment(this.endTime));
    var diffHour = moment(this.startTime).diff(moment(this.endTime), 'h');
    if (diffTime > 0 || Math.abs(diffHour) >= 8) {
        this.endTime = moment(this.startTime).add(1, 'h').format('YYYY-MM-DD HH:mm:ss');
        this.background.createInfo({
            title: '时间选择注意事项：',
            message: '1.开始时间不能小于结束时间 2.会议室最多订8个小时'
        });
    }
});
var endLayDate = renderLaydate('#end-time', function (value, date) {
    this.endTime = value;
    var diffTime = moment(this.startTime).diff(moment(this.endTime));
    var diffHour = moment(this.startTime).diff(moment(this.endTime), 'h');
    if (diffTime > 0 || Math.abs(diffHour) >= 8) {
        this.startTime = moment(this.endTime).subtract(1, 'h').format('YYYY-MM-DD HH:mm:ss');
        this.background.createInfo({
            title: '时间选择注意事项：',
            message: '1.开始时间不能小于结束时间 2.会议室最多订8个小时'
        });
    }
});

var popup = new Popup();

popup.start();

// chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){

// })
