/*==============================================================================
 * (C) Copyright 2015,2016,2017,2018 John J Kauflin, All rights reserved.
 *----------------------------------------------------------------------------
 * DESCRIPTION:
 *----------------------------------------------------------------------------
 * Modification History
 * 2016-05-17 JJK   Implemented Config update page
 * 2016-05-18 JJK   Added setTextArea
 * 2016-07-08 JJK   Modified to get all config list values on page load
 * 2018-10-20 JJK   Re-factor for module design
 * 2018-10-21 JJK   Re-factor for JSON based POST for updates
 * 2020-08-03 JJK   Re-factored for new error handling
 * 2020-08-05 JJK   Re-did the map loading and rendering to not load on
 *                  page load - have the load called after login
 * 2020-08-06 JJK   Added functions to load and return the Logo image data
 * 2020-12-22 JJK   Modified for changes to jjklogin - added event
 *                  handling to call the config load functions when a user
 *                  is authenticated (using the new jjklogin event)
 * 2025-08-20 JJK   Starting conversion to Bootstrap 5, vanilla JS, 
 *                  js module, and move from PHP/MySQL to Azure SWA
 *============================================================================*/

import {empty,showLoadingSpinner,checkFetchResponse,standardizeDate,formatDate,formatMoney,setTD,setCheckbox} from './util.js';

//=================================================================================================================
// Variables cached from the DOM
var ConfigListTbody;
var ConfigUpdateModal;
var UpdateConfigForm;
var UpdateConfigMessageDisplay;
var updConfigName;
var updConfigDesc;
var updConfigValue;
var configList = [];

//=================================================================================================================
// Bind events

document.addEventListener('DOMContentLoaded', () => {
	ConfigListTbody = document.getElementById('ConfigListTbody');
	ConfigUpdateModal = new bootstrap.Modal(document.getElementById('ConfigUpdateModal'));
	UpdateConfigForm = document.getElementById('UpdateConfigForm');
	UpdateConfigMessageDisplay = document.getElementById('UpdateConfigMessageDisplay');
	updConfigName = document.getElementById('updConfigName');
	updConfigDesc = document.getElementById('updConfigDesc');
	updConfigValue = document.getElementById('updConfigValue');

	document.querySelector('.NewConfig').addEventListener('click', function (event) {
		event.preventDefault();
		formatUpdateConfig('NEW');
	});

	UpdateConfigForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		event.stopPropagation();
		UpdateConfigMessageDisplay.textContent = '';
		if (!UpdateConfigForm.checkValidity()) {
			UpdateConfigMessageDisplay.textContent = 'Form inputs are NOT valid';
			UpdateConfigForm.classList.add('was-validated');
			return;
		}
		await updateConfig();
	});

	getConfigList();
});

async function getConfigList() {
	showLoadingSpinner(ConfigListTbody);
	try {
		const response = await fetch('/api/GetConfigList', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' }
		});
		await checkFetchResponse(response);
		configList = await response.json();
		formatConfigList(configList);
	} catch (err) {
		ConfigListTbody.textContent = 'Error loading config values: ' + err.message;
	}
}

function formatConfigList(list) {
	empty(ConfigListTbody);
	if (!list || list.length === 0) {
		let tr = document.createElement('tr');
		let td = document.createElement('td');
		td.colSpan = 3;
		td.textContent = 'No config values found.';
		tr.appendChild(td);
		ConfigListTbody.appendChild(tr);
		return;
	}
	let tr = document.createElement('tr');
	let th = document.createElement('th'); th.textContent = 'Name'; tr.appendChild(th);
	th = document.createElement('th'); th.textContent = 'Description'; tr.appendChild(th);
	th = document.createElement('th'); th.textContent = 'Value'; tr.appendChild(th);
	th = document.createElement('th'); th.textContent = 'Edit'; tr.appendChild(th);
	ConfigListTbody.appendChild(tr);
	list.forEach(cfg => {
		tr = document.createElement('tr');
		let td = document.createElement('td'); td.textContent = cfg.configName; tr.appendChild(td);
		td = document.createElement('td'); td.textContent = cfg.configDesc; tr.appendChild(td);
		td = document.createElement('td'); td.textContent = cfg.configValue; tr.appendChild(td);
		td = document.createElement('td');
		let btn = document.createElement('button');
		btn.classList.add('btn', 'btn-sm', 'btn-primary', 'EditConfig');
		btn.textContent = 'Edit';
		btn.dataset.configname = cfg.configName;
		btn.addEventListener('click', function (event) {
			event.preventDefault();
			formatUpdateConfig(cfg.configName);
		});
		td.appendChild(btn);
		tr.appendChild(td);
		ConfigListTbody.appendChild(tr);
	});
}

function formatUpdateConfig(configName) {
	UpdateConfigMessageDisplay.textContent = '';
	UpdateConfigForm.classList.remove('was-validated');
	if (configName === 'NEW') {
		updConfigName.value = '';
		updConfigName.readOnly = false;
		updConfigDesc.value = '';
		updConfigValue.value = '';
	} else {
		let cfg = configList.find(c => c.configName === configName);
		if (!cfg) return;
		updConfigName.value = cfg.configName;
		updConfigName.readOnly = true;
		updConfigDesc.value = cfg.configDesc || '';
		updConfigValue.value = cfg.configValue || '';
	}
	ConfigUpdateModal.show();
}

async function updateConfig() {
	UpdateConfigMessageDisplay.textContent = 'Saving...';
	let paramData = {
		configName: updConfigName.value,
		configDesc: updConfigDesc.value,
		configValue: updConfigValue.value
	};
	try {
		const response = await fetch('/api/UpdateConfig', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(paramData)
		});
		await checkFetchResponse(response);
		ConfigUpdateModal.hide();
		getConfigList();
	} catch (err) {
		UpdateConfigMessageDisplay.textContent = 'Error saving config: ' + err.message;
	}
}

