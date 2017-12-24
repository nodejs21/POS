const express = require("express");
const sql = require("mssql");
const CryptoJS = require("crypto-js");
const bodyParser = require("body-parser");

var app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const port = process.env.PORT || 3000;

const DbConnectionString = {
	user: 'sa',
	password: 'Abc656565',
	server: '104.233.109.130',
	database: 'RPOS_CAFE',
	options: {
		tdsVersion: '7_1'
	}
};

app.post('/login', (req, res) => {
	sql.close();
	var username = req.body.username;
	var password = req.body.password;
	var raw = CryptoJS.enc.Utf8.parse(password);
	var base64 = CryptoJS.enc.Base64.stringify(raw);
	var query = `SELECT RTRIM(UserID) AS UserID FROM Registration WHERE UserID = '${username}' AND Password = '${base64}'`;
	var final = [];
	sql.connect(DbConnectionString).then(async (pool) => {
		var result = await pool.request().query(query);
		if(!result || result.recordsets[0].length === 0)
			return res.status(401).send("Invalid Username or Password!!");
		query =`DECLARE @y int = Year(GETDATE());
		DECLARE @kot int  = (SELECT COUNT(*) FROM RestaurantPOS_BillingInfoKOT WHERE YEAR(BillDate) = @y);
		DECLARE @ta int  = (SELECT COUNT(*) FROM RestaurantPOS_BillingInfoTA WHERE YEAR(BillDate) = @y);
		DECLARE @hd int  = (SELECT COUNT(*) FROM RestaurantPOS_BillingInfoHD WHERE YEAR(BillDate) = @y);
		SELECT @y AS Year,(@kot + @ta + @hd) AS YearTotalSales, @kot AS YearKOTSales, @ta AS YearTASales, @hd AS YearHDSales;`;
		result = await pool.request().query(query);
		var yearQueryRecordset = result.recordset[0];
		query =`DECLARE @y int = Year(GETDATE());
		SELECT Month(BillDate) as Month, COUNT(*) AS Sales FROM RestaurantPOS_BillingInfoKOT WHERE YEAR(BillDate) = @y GROUP BY Month(BillDate);
		SELECT Month(BillDate) as Month, COUNT(*) AS Sales FROM RestaurantPOS_BillingInfoTA WHERE YEAR(BillDate) = @y GROUP BY Month(BillDate);
		SELECT Month(BillDate) as Month, COUNT(*) AS Sales FROM RestaurantPOS_BillingInfoHD WHERE YEAR(BillDate) = @y GROUP BY Month(BillDate);`;
		result = await pool.request().query(query);
		var monthRecordsets = result.recordsets;
		var monthKotRecordset = result.recordsets[0];
		var monthTaRecordset = result.recordsets[1];
		var monthHdRecordset = result.recordsets[2];
		final.push({
			"Years": [{
				"Year": yearQueryRecordset.Year,
				"YearTotalSales": yearQueryRecordset.YearTotalSales,
				"YearKOTSales": yearQueryRecordset.YearKOTSales,
				"YearTASales": yearQueryRecordset.YearTASales,
				"YearHDSales": yearQueryRecordset.YearHDSales,
				"Months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
				"MonthTotalSales": 0,
				"MonthKOTSales": [0,0,0,0,0,0,0,0,0,0,0,0],
				"MonthTASales": [0,0,0,0,0,0,0,0,0,0,0,0],
				"MonthHDSales": [0,0,0,0,0,0,0,0,0,0,0,0],
				"Days": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31],
				"DayTotalSales": 0,
				"DayKOTSales": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				"DayTASales": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
				"DayHDSales": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
			}]
		});
		var length = 0;
		var monthTotalSales = 0;
		var monthNumber = 0;
		var monthSales = 0;
		var temp = final[0].Years[0];
		for(i in monthRecordsets) {
			length = monthRecordsets[i].length;
			for(var x = 0; x<length; x++) {
				monthNumber = monthRecordsets[i][x].Month;
				monthSales = monthRecordsets[i][x].Sales;
				monthTotalSales += monthSales;
				if(i === "0") {
					temp.MonthKOTSales.splice(monthNumber-1, 1, monthSales);
				} else if(i === "1") {
					temp.MonthTASales.splice(monthNumber-1, 1, monthSales);
				} else if(i === "2") {
					temp.MonthHDSales.splice(monthNumber-1, 1, monthSales);
				}
			}
		}
		temp.MonthTotalSales = monthTotalSales;
		query =`DECLARE @m int = MONTH(GETDATE());
		SELECT Day(BillDate) as Day,COUNT(*) as Sales FROM RestaurantPOS_BillingInfoKOT WHERE Month(BillDate) = @m GROUP BY DAY(BillDate);
		SELECT Day(BillDate) as Day,COUNT(*) as Sales FROM RestaurantPOS_BillingInfoTA WHERE Month(BillDate) = @m GROUP BY DAY(BillDate);
		SELECT Day(BillDate) as Day,COUNT(*) as Sales FROM RestaurantPOS_BillingInfoHD WHERE Month(BillDate) = @m GROUP BY DAY(BillDate);`;
		result = await pool.request().query(query);
		var dayRecordsets = result.recordsets;
		var dayTotalSales = 0;
		var dayNumber = 0;
		var daySales = 0;
		for(i in dayRecordsets) {
			length = dayRecordsets[i].length;
			for(var x = 0; x<length; x++) {
				dayNumber = dayRecordsets[i][x].Day;
				daySales = dayRecordsets[i][x].Sales;
				dayTotalSales += daySales;
				if(i === "0") {
					temp.DayKOTSales.splice(dayNumber-1, 1, daySales);
				} else if(i === "1") {
					temp.DayTASales.splice(dayNumber-1, 1, daySales);
				} else if(i === "2") {
					temp.DayHDSales.splice(dayNumber-1, 1, daySales);
				}
			}
		}
		temp.DayTotalSales = dayTotalSales;
		/*query =`DECLARE @Y int = YEAR(GETDATE());
		SELECT Month(BillDate) AS Month, Day(BillDate) as Day,COUNT(*) as Sales FROM RestaurantPOS_BillingInfoKOT WHERE YEAR(BillDate) = YEAR(GETDATE()) AND Month(BillDate) BETWEEN 1 AND 12 GROUP BY DAY(BillDate), Month(BillDate);
		SELECT Month(BillDate) AS Month, Day(BillDate) as Day,COUNT(*) as Sales FROM RestaurantPOS_BillingInfoTA WHERE YEAR(BillDate) = YEAR(GETDATE()) AND Month(BillDate) BETWEEN 1 AND 12 GROUP BY DAY(BillDate), Month(BillDate);
		SELECT Month(BillDate) AS Month, Day(BillDate) as Day,COUNT(*) as Sales FROM RestaurantPOS_BillingInfoHD WHERE YEAR(BillDate) = YEAR(GETDATE()) AND Month(BillDate) BETWEEN 1 AND 12 GROUP BY DAY(BillDate), Month(BillDate);`
		result = await pool.request().query(query);
		var dayRecordsets = result.recordsets;
		var length = 0;
		var monthTotalSales = 0;
		var finalMonthTotalSales = 0;
		var dayTotalSales = 0;
		var monthNumber = 0;
		var prevMonth = 0;
		var dayNumber = 0;
		var prevDaySales = 0;
		var monthSales = 0;
		var daySales = 0;
		var temp = final[0].Years[0];
		for(i in dayRecordsets) {
			length = dayRecordsets[i].length;
			for(var x = 0; x<length; x++) {
				monthNumber = dayRecordsets[i][x].Month;
				dayNumber = dayRecordsets[i][x].Day;
				daySales = dayRecordsets[i][x].Sales;
				if(monthNumber === prevMonth) {
					monthTotalSales += prevDaySales;
					finalMonthTotalSales += prevDaySales;
				} else if(prevMonth !== 0){
					monthTotalSales += prevDaySales;
					// console.log(`PrevMonth:${prevMonth} MonthTotalSales:${monthTotalSales}\n`);
					if(i === "0") {
						temp.MonthKOTSales.splice(prevMonth-1, 1, monthTotalSales);
					} else if(i === "1") {
						temp.MonthTASales.splice(prevMonth-1, 1, monthTotalSales);
					} else if(i === "2") {
						temp.MonthHDSales.splice(prevMonth-1, 1, monthTotalSales);
					}
					finalMonthTotalSales += prevDaySales;
					monthTotalSales = 0;
				}
				prevMonth = monthNumber;
				prevDaySales = daySales;
				// console.log(`i:${i} x:${x}  MonthNumber:${monthNumber} PrevMonth:${prevMonth} DaySales:${daySales} PrevDaySales:${prevDaySales} FinalMonthTotalSales:${finalMonthTotalSales}`);
				if(i === "0") {
					temp.MonthKOTSales.splice(prevMonth-1, 1, monthTotalSales+daySales);
				} else if(i === "1") {
					temp.MonthTASales.splice(prevMonth-1, 1, monthTotalSales+daySales);
				} else if(i === "2") {
					temp.MonthHDSales.splice(prevMonth-1, 1, monthTotalSales+daySales);
				}
			}
		}
		temp.MonthTotalSales = finalMonthTotalSales+daySales;*/
		// res.json(result);
		res.json(final);
	}).catch((err) => {
		return res.json(err);
	});
});

// SELECT YEAR(BillDate) as Year, DATENAME(month, BillDate) as Month, datediff(week, dateadd(week, datediff(week, 0, dateadd(month, datediff(month, 0, BillDate), 0)), 0), BillDate- 1) + 1 as Week, COUNT(*) AS Sales FROM RestaurantPOS_BillingInfoKOT WHERE DATENAME(month, BillDate) = 'December' GROUP BY DATENAME(month, BillDate), YEAR(BillDate), datediff(week, dateadd(week, datediff(week, 0, dateadd(month, datediff(month, 0, BillDate), 0)), 0), BillDate- 1) + 1 ORDER BY YEAR(BillDate), DATENAME(month, BillDate) DESC ;

app.listen(port, () => {
	console.log(`Server listening at port: ${port}`);
});