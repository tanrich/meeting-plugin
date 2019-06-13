/**
 * @file 公共函数，用于提供存储、获取、获得DOM的简易操作
 * @author tanrich@foxmail.com
 */

function set(data, onComplete) {
	chrome.storage.local.set(data, onComplete);
}

function get(data, onComplete) {
	chrome.storage.local.get(data, onComplete);
}

function getDom(str) {
	if (str.indexOf('#') !== -1) {
		return document.getElementById(str.slice(1));
	}
	var nodeLists = document.querySelectorAll(str);
	if (nodeLists.length > 1) {
		return nodeLists;
	}
	return document.querySelector(str);
}
