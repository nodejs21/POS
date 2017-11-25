const express = require("express");
const sql = require('mssql');
const CryptoJS = require('crypto-js');
const bodyParser = require('body-parser');

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
	var pass = req.body.pass;
	var raw = CryptoJS.enc.Utf8.parse(pass);
	var base64 = CryptoJS.enc.Base64.stringify(raw);
	var query1 = `SELECT * FROM Registration WHERE Password='${base64}';`;
	sql.connect(DbConnectionString).then(async (pool) => {
		var result1 = await pool.request().query(query1);
		if(!result1) {
			return res.send("Check your password!!");
		}
		var UserID = result1.recordset[0].UserID;
		var query2 = `SELECT r.UserID, t.id, t.TicketNo, t.GrandTotal, t.TableNo  FROM Registration as r JOIN TempRestaurantPOS_OrderInfoKOT as t ON r.UserID = '${UserID}' AND t.Operator = '${UserID}';`;
		var result2 = await pool.request().query(query2);
		if(!result2) {
			return res.send(`No record found against ${UserID}`);
		}
		return res.json(result2.recordset);
	}).catch((err) => {
		return res.json(err);
	});
});

app.get('/tables', (req, res) => {
	sql.close();
	var query = `SELECT * FROM R_Table;`;
	sql.connect(DbConnectionString).then((pool) => {
		return pool.request()
		.query(query);
	}).then((result) => {
		if(!result) {
			return res.send('No record found!!');
		}
		var records = result.recordset;
		var S1 = [];
		var S2 = [];
		var S3 = [];
		records.forEach((floor) => {
			var f = floor.Floor
			delete floor.Floor;
			if(f === "S1") {
				S1.push(floor);
			} else if(f === "S2"){
				S2.push(floor);
			} else if(f === "S3"){
				S3.push(floor);
			}
		});
		var all = {S1,S2,S3}
		res.json(all);
		// return res.json(result.recordset);
	}).catch((err) => {
		res.json(err);
	});
});

app.get('/categories', (req, res) => {
	sql.close();
	var query = ``;
	sql.connect(DbConnectionString).then((pool) => {
		return pool.request()
		.query(query);
	}).then((result) => {

	}).catch((err) => {
		res.json(err);
	});
});

app.listen(port, function() {
	console.log(`node server listening at port : ${port}`);
});