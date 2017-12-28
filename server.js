const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const CryptoJS = require("crypto-js");
const bodyParser = require("body-parser");

var app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors());

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
		// query =`DECLARE @y int = Year(GETDATE());
		// DECLARE @kot int  = (SELECT COUNT(*) FROM RestaurantPOS_BillingInfoKOT WHERE YEAR(BillDate) = @y);
		// DECLARE @ta int  = (SELECT COUNT(*) FROM RestaurantPOS_BillingInfoTA WHERE YEAR(BillDate) = @y);
		// DECLARE @hd int  = (SELECT COUNT(*) FROM RestaurantPOS_BillingInfoHD WHERE YEAR(BillDate) = @y);
		// SELECT @y AS Year,(@kot + @ta + @hd) AS YearTotalSales, @kot AS YearKOTSales, @ta AS YearTASales, @hd AS YearHDSales;`;
		// result = await pool.request().query(query);
		// var yearQueryRecordset = result.recordset[0];
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
				"Year": new Date().getFullYear(),
				"YearTotalSales": [0,0,0,0,0,0,0,0,0,0,0,0],
				"YearKOTSales": [0,0,0,0,0,0,0,0,0,0,0,0],
				"YearTASales": [0,0,0,0,0,0,0,0,0,0,0,0],
				"YearHDSales": [0,0,0,0,0,0,0,0,0,0,0,0],
				"DayTotalSales": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
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
					temp.YearKOTSales.splice(monthNumber-1, 1, monthSales);
				} else if(i === "1") {
					temp.YearTASales.splice(monthNumber-1, 1, monthSales);
				} else if(i === "2") {
					temp.YearHDSales.splice(monthNumber-1, 1, monthSales);
				}
			}
		}
		for(var i = 0; i < 12; i++) {
			temp.YearTotalSales[i] = temp.YearKOTSales[i] + temp.YearTASales[i] + temp.YearHDSales[i];
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
		for(var i = 0; i < 31; i++) {
			temp.DayTotalSales[i] = temp.DayKOTSales[i] + temp.DayTASales[i] + temp.DayHDSales[i];
		}
		res.json(final[0].Years[0]);
	}).catch((err) => {
		return res.json(err);
	});
});

app.listen(port, () => {
	console.log(`Server listening at port: ${port}`);
});