/*==============================================================================
(C) Copyright 2024 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Common utility functions for Web API's
--------------------------------------------------------------------------------
Modification History
2024-08-28 JJK  Initial version (converted from older PHP code)
2024-11-01 JJK - Updated Total Due logic according to changes specified by GRHA Board and new Treasurer
    Remove the restriction of an Open Lien to adding the interest on the unpaid assessment - it will now start adding
    interest when unpaid and past the DUE DATE.
    In addition, a $10 a month late fee will be added to any unpaid assessments
2024-11-04 JJK  Finished stringToMoney and CalcCompoundInterest
2024-11-20 JJK  Added CalcTotalDues as a common function for doing the 
                calculation of total dues (& fees) based on Assessments
2025-08-17 JJK  Added a better version of stringToMoney that allows for currency symbols, 
                thousands separators, and decimal points
2025-08-27 JJK  Added IsValidEmail to check email addresses
2025-10-15 JJK  Updated CalcTotalDues to use the assessmentRec.StopInterestCalc
                flag to determine calculation of ALL interest and late fees
                (if set, they will not be added to the total due)
                *** And there will be a function to set this flag for all
                un-PAID assessments (for properties that are engaged in a payment plan)
================================================================================*/

using System.Net.Mail;
using System.Globalization;
using Microsoft.Extensions.Logging;

using GrhaWeb.Function.Model;

namespace GrhaWeb.Function
{
    public class CommonUtil
    {
        private readonly ILogger log;
        public CommonUtil(ILogger logger)
        {
            log = logger;
        }

        public bool IsValidEmail(string email)
        {
            try
            {
                var addr = new MailAddress(email);
                return addr.Address == email.Trim();
            }
            catch
            {
                return false;
            }
        }
        
        public decimal stringToMoney(string moneyString)
        {
            /*
            // Remove the dollar sign and parse the string to a decimal
            decimal moneyValue = decimal.Parse(moneyString.TrimStart('$'));
            // Round down to 2 decimal places
            moneyValue = Math.Floor(moneyValue * 100) / 100;
            return moneyValue;
            */

            // Allow currency symbols, thousands separators, and decimal points
            var style = NumberStyles.Currency;
            var culture = CultureInfo.GetCultureInfo("en-US");

            if (Decimal.TryParse(moneyString, style, culture, out decimal result))
            {
                Console.WriteLine($"Parsed value: {result}"); // Output: 1234.56
            }
            else
            {
                throw new FormatException("Invalid money format, moneyString: " + moneyString);
            }
            return result;
        }

        //---------------------------------------------------------------------------------------------------
        // Calculate the total dues amount from the property assessments information and pass back a list
        // of the individual charge amounts and description
        //---------------------------------------------------------------------------------------------------
        public List<TotalDuesCalcRec> CalcTotalDues(List<hoa_assessments> assessmentsList,
                                                    out bool onlyCurrYearDue,
                                                    out decimal totalDue)
        {

            List<TotalDuesCalcRec> totalDuesCalcList = new List<TotalDuesCalcRec>();
            onlyCurrYearDue = false;
            totalDue = 0.00m;

            DateTime currDate = DateTime.Now;
            DateTime dateDue;
            string duesAmtStr;
            bool duesDue;
            decimal duesAmt = 0.0m;
            decimal totalLateFees;
            int monthsApart;
            int prevFY;
            string dispositionStr;
            TotalDuesCalcRec totalDuesCalcRec;
            int cnt = 0;

            // Loop through the property assessments
            foreach (var assessmentRec in assessmentsList)
            {
                cnt++;
                string tempDateDue = assessmentRec.DateDue.Split(' ')[0];
                dateDue = DateTime.Parse(tempDateDue);
                duesDue = false;

                // If NOT PAID (and still able to be collected)
                if (assessmentRec.Paid != 1 && assessmentRec.NonCollectible != 1)
                {
                    if (cnt == 1)
                    {
                        onlyCurrYearDue = true;
                    }
                    else
                    {
                        onlyCurrYearDue = false;
                    }

                    // check dates (if NOT PAID)
                    if (currDate > dateDue)
                    {
                        duesDue = true;
                    }

                    duesAmtStr = assessmentRec.DuesAmt ?? "";
                    duesAmt = stringToMoney(duesAmtStr);

                    totalDue += duesAmt;

                    totalDuesCalcRec = new TotalDuesCalcRec();
                    totalDuesCalcRec.calcDesc = "FY " + assessmentRec.FY.ToString() + " Assessment (due " + tempDateDue + ")";
                    totalDuesCalcRec.calcValue = duesAmt.ToString();
                    totalDuesCalcList.Add(totalDuesCalcRec);

                    //================================================================================================================================
                    // 2024-11-01 JJK - Updated Total Due logic according to changes specified by GRHA Board and new Treasurer
                    //      Remove the restriction of an Open Lien to adding the interest on the unpaid assessment - it will now start adding
                    //      interest when unpaid and past the DUE DATE.
                    //      In addition, a $10 a month late fee will be added to any unpaid assessments
                    //          *** Starting on 11/1/2024, Do it for every unpaid assessment (per year) for number of months from 11/1/FY-1
                    //          FY > 2024
                    //          if months > 10, use 10 ($100) - show a LATE FEE for every unpaid assessment
                    //================================================================================================================================
                    // If not PAID and past the due date, then add interest and late fees
                    if (duesDue)
                    {
                        // Assume that if past due, there will be interest and fees (so can't just pay the curr year due)
                        onlyCurrYearDue = false;

                        // If still calculating interest dynamically calculate the compound interest (else just use the value from the assessment record)
                        if (assessmentRec.StopInterestCalc != 1)
                        {
                            // if still calculating interest dynamically, calculate the compound interest
                            // (else just use the value from the assessment record)
                            assessmentRec.AssessmentInterest = CalcCompoundInterest(duesAmt, dateDue);

                            // move the Fee calc here?

                            // Calculate monthly late fees (starting in November 2024 for the FY 2025)
                            if (assessmentRec.FY > 2024)
                            {
                                // number of months between the due date and current date
                                monthsApart = ((currDate.Year - dateDue.Year) * 12) + currDate.Month - dateDue.Month;
                                // Ensure the number of months is non-negative
                                monthsApart = Math.Abs(monthsApart);
                                if (monthsApart > 10)
                                {
                                    monthsApart = 10;
                                }

                                totalLateFees = 10.00m * monthsApart;

                                if (totalLateFees > 0.00m)
                                {
                                    totalDue += totalLateFees;
                                    prevFY = assessmentRec.FY - 1;
                                    totalDuesCalcRec = new TotalDuesCalcRec();
                                    totalDuesCalcRec.calcDesc = "$10 a Month late fee on FY " + assessmentRec.FY.ToString() + " Assessment (since " + prevFY.ToString() + "-10-31)";
                                    totalDuesCalcRec.calcValue = totalLateFees.ToString();
                                    totalDuesCalcList.Add(totalDuesCalcRec);
                                }
                            }
                        }

                        if (assessmentRec.AssessmentInterest > 0.00m)
                        {
                            totalDue += assessmentRec.AssessmentInterest;
                            totalDuesCalcRec = new TotalDuesCalcRec();
                            totalDuesCalcRec.calcDesc = "%6 Interest on FY " + assessmentRec.FY.ToString() + " Assessment (since " + tempDateDue + ")";
                            totalDuesCalcRec.calcValue = assessmentRec.AssessmentInterest.ToString();
                            totalDuesCalcList.Add(totalDuesCalcRec);
                        }

                    } // if (duesDue) {

                } // if (assessmentRec.Paid != 1 && assessmentRec.NonCollectible != 1) {


                // If the Assessment was Paid but the interest was not, then add the interest to the total
                if (assessmentRec.Paid == 1 && assessmentRec.InterestNotPaid == 1)
                {
                    onlyCurrYearDue = false;

                    // If still calculating interest dynamically calculate the compound interest
                    if (assessmentRec.StopInterestCalc != 1)
                    {
                        assessmentRec.AssessmentInterest = CalcCompoundInterest(duesAmt, dateDue);
                    }

                    totalDue += assessmentRec.AssessmentInterest;

                    totalDuesCalcRec = new TotalDuesCalcRec();
                    totalDuesCalcRec.calcDesc = "%6 Interest on FY " + assessmentRec.FY.ToString() + " Assessment (since " + tempDateDue + ")";
                    totalDuesCalcRec.calcValue = assessmentRec.AssessmentInterest.ToString();
                    totalDuesCalcList.Add(totalDuesCalcRec);
                } //  if (assessmentRec.Paid == 1 && assessmentRec.InterestNotPaid == 1) {


                // If there is an Open Lien (not Paid, Released, or Closed)
                dispositionStr = assessmentRec.Disposition ?? "";
                if (assessmentRec.Lien == 1 && dispositionStr.Equals("Open") && assessmentRec.NonCollectible != 1)
                {
                    // calc interest - start date   WHEN TO CALC INTEREST
                    // unpaid fee amount and interest since the Filing Date

                    // if there is a Filing Fee (on an Open Lien), then check to calc interest (or use stored value)
                    if (assessmentRec.FilingFee > 0.0m)
                    {
                        totalDue += assessmentRec.FilingFee;
                        totalDuesCalcRec = new TotalDuesCalcRec();
                        totalDuesCalcRec.calcDesc = "FY " + assessmentRec.FY.ToString() + " Assessment Lien Filing Fee";
                        totalDuesCalcRec.calcValue = assessmentRec.FilingFee.ToString();
                        totalDuesCalcList.Add(totalDuesCalcRec);

                        // If still calculating interest dynamically calculate the compound interest
                        if (assessmentRec.StopInterestCalc != 1)
                        {
                            assessmentRec.FilingFeeInterest = CalcCompoundInterest(assessmentRec.FilingFee, assessmentRec.DateFiled);
                        }

                        totalDue += assessmentRec.FilingFeeInterest;
                        totalDuesCalcRec = new TotalDuesCalcRec();
                        totalDuesCalcRec.calcDesc = "%6 Interest on Filing Fees (since " + assessmentRec.DateFiled.ToString("yyyy-MM-dd") + ")";
                        totalDuesCalcRec.calcValue = assessmentRec.FilingFeeInterest.ToString();
                        totalDuesCalcList.Add(totalDuesCalcRec);
                    }

                    if (assessmentRec.ReleaseFee > 0.0m)
                    {
                        totalDue += assessmentRec.ReleaseFee;
                        totalDuesCalcRec = new TotalDuesCalcRec();
                        totalDuesCalcRec.calcDesc = "FY " + assessmentRec.FY.ToString() + " Assessment Lien Release Fee";
                        totalDuesCalcRec.calcValue = assessmentRec.ReleaseFee.ToString();
                        totalDuesCalcList.Add(totalDuesCalcRec);
                    }

                    if (assessmentRec.BankFee > 0.0m)
                    {
                        totalDue += assessmentRec.BankFee;
                        totalDuesCalcRec = new TotalDuesCalcRec();
                        totalDuesCalcRec.calcDesc = "FY " + assessmentRec.FY.ToString() + " Assessment Bank Fee";
                        totalDuesCalcRec.calcValue = assessmentRec.BankFee.ToString();
                        totalDuesCalcList.Add(totalDuesCalcRec);
                    }
                } // if (assessmentRec.Lien == 1 && dispositionStr.Equals("Open") && assessmentRec.NonCollectible != 1) {

            } // foreach (var assessmentRec in assessmentsList)

            return totalDuesCalcList;
        }

        public decimal CalcCompoundInterest(decimal principal, DateTime startDate) {
			/*
				 A = the future value of the investment/loan, including interest
				 P = the principal investment amount (the initial deposit or loan amount)
				 r = the annual interest rate (decimal)
				 n = the number of times that interest is compounded per year
				 t = the number of years the money is invested or borrowed for
				 A = P(1+r/n)^nt
			*/

            double interestAmount;

            // Annaul percentage rate (i.e. 6%)
            double rate = 0.06;
            // Frequency of compounding (1 = yearly, 12 = monthly)
            double annualFrequency = 12.0;

            DateTime currDate = DateTime.Now;
            TimeSpan diff = currDate - startDate;

            // Time in fractional years
            double timeInYears = Math.Abs(diff.Days) / 365.0;
            double P = (double) principal;
            double A = P * Math.Pow(1.0+(rate/annualFrequency), annualFrequency*timeInYears);
            interestAmount = A - P;
            // Round to 2 decimal places
            interestAmount = Math.Round(interestAmount,2);

            //log.LogWarning($">>> timeInYears: {timeInYears}, P: {P}, A: {A}, interestAmount: {interestAmount}");

            return (decimal)interestAmount;
        }

    } // public class CommonUtil
} // namespace GrhaWeb.Function

