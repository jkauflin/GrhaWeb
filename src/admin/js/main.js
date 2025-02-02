/*==============================================================================
 * (C) Copyright 2015,2020,2024 John J Kauflin, All rights reserved.
 *----------------------------------------------------------------------------
 * DESCRIPTION:     Javascript code for hoadb web
 *----------------------------------------------------------------------------
 * Modification History
 * 2025-01-09 JJK 	Initial version
*============================================================================*/

import {empty} from './util.js';

//var paymentList = null;
//var commList = null;

// Keep track of the state of the navbar collapse (shown or hidden)
var navbarCollapseShown = false;
var collapsibleNavbar = document.getElementsByClassName("navbar-collapse")[0];
collapsibleNavbar.addEventListener('hidden.bs.collapse', function () {
    navbarCollapseShown = false;
})
collapsibleNavbar.addEventListener('shown.bs.collapse', function () {
    navbarCollapseShown = true;
})
     
// Listen for nav-link clicks
document.querySelectorAll("a.nav-link").forEach(el => el.addEventListener("click", function (event) {
    // Automatically hide the navbar collapse when an item link is clicked (and the collapse is currently shown)
    if (navbarCollapseShown) {
        new bootstrap.Collapse(document.getElementsByClassName("navbar-collapse")[0]).hide()
    }
}))
    
// 8/9/2020 Focus on the first non-readonly input field when a modal pops up
/* >>>>> find out if we still need this
$document.on('shown.bs.modal', function (e) {
    $('input:visible:enabled:not([readonly]):first', e.target).focus(); 
});
*/

/*
document.addEventListener('DOMContentLoaded', function() {
    const yearPicker = document.getElementById('year-picker');
  
    yearPicker.addEventListener('focus', function() {
      const currentYear = new Date().getFullYear();
      const yearRange = 20; // Number of years to show in the dropdown
      let yearDropdown = document.createElement('select');
      yearDropdown.className = 'year-dropdown';
      
      for (let year = currentYear - yearRange; year <= currentYear + yearRange; year++) {
        let option = document.createElement('option');
        option.value = year;
        option.text = year;
        yearDropdown.appendChild(option);
      }
  
      yearDropdown.addEventListener('change', function() {
        yearPicker.value = this.value;
        document.body.removeChild(yearDropdown);
      });
  
      const { left, top, height } = yearPicker.getBoundingClientRect();
      yearDropdown.style.position = 'absolute';
      yearDropdown.style.left = `${left}px`;
      yearDropdown.style.top = `${top + height}px`;
  
      document.body.appendChild(yearDropdown);
    });
  
    document.addEventListener('click', function(event) {
      if (!yearPicker.contains(event.target)) {
        const yearDropdown = document.querySelector('.year-dropdown');
        if (yearDropdown) {
          document.body.removeChild(yearDropdown);
        }
      }
    });
  });
*/