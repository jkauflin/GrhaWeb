﻿using System;
using System.Collections.Generic;
using System.Text;
using Newtonsoft.Json;

namespace GrhaWeb.Function.Model
{
    public class HoaRec
    {
        //public string id { get; set; }

        public hoa_properties? property { get; set; }
        public List<hoa_owners>? ownersList { get; set; }
        public List<hoa_assessments>? assessmentsList { get; set; }
        public List<hoa_communications>? commList { get; set; }
        public List<hoa_sales>? salesList { get; set; }
        public List<TotalDuesCalcRec>? totalDuesCalcList { get; set; }
        public List<string>? emailAddrList { get; set; }
        public string? duesEmailAddr { get; set; }   
	    public decimal totalDue { get; set; }       // amount = 1234.56m;
	    public decimal paymentFee { get; set; }     // amount = 1234.56m;
        public string? paymentInstructions { get; set; }   
        
	    //public $adminLevel;               // No longer needed - now using role-based security
        //public $paymentButton;            // No longer used
        //public $userName;                 // Needed for updates but don't think I need it in the hoa_rec class

        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }

    /*
    public class TotalDuesCalcRec
    {
        public string? calcDesc { get; set; }
        public string? calcValue { get; set; }
    }
    */

}
