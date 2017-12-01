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

app.post('/addOrder', (req, res) => {
	sql.close();
	var query1 = "";
	var query2 = "";
	sql.connect(DbConnectionString).then(async (pool) => {
		await pool.request().query(`UPDATE R_Table SET BkColor='-65536' WHERE TableNo='${req.body.TableNo}';`);
		var c = await pool.request().query(`SELECT max(Id) AS max_id FROM RestaurantPOS_OrderInfoKOT;`);
		c = c.recordset[0].max_id;
		var b = `KOT-${c+1}`;
		query1 = `INSERT INTO RestaurantPOS_OrderInfoKOT (Id, TicketNo, BillDate,GroupName,GrandTotal, TableNo, Operator, TicketNote, GST) VALUES (${c+1},'${b}', CURRENT_TIMESTAMP,'${b}','${req.body.GrandTotal}', '${req.body.TableNo}', '${req.body.Operator}','${req.body.TicketNote}', '${req.body.Gst}');INSERT INTO TempRestaurantPOS_OrderInfoKOT (Id, TicketNo, BillDate,GroupName,GrandTotal, TableNo, Operator, TicketNote, GST) VALUES (${c+1},'${b}', CURRENT_TIMESTAMP,'${b}','${req.body.GrandTotal}', '${req.body.TableNo}', '${req.body.Operator}','${req.body.TicketNote}', '${req.body.Gst}');`;
		await pool.request().query(query1);
		req.body.Dishes.forEach((dish) => {
			query2 += `INSERT INTO RestaurantPOS_OrderedProductKOT (TicketID, Dish, Rate, Quantity, Amount, VATPer, VATAmount, STPer, STAmount, SCPer, SCAmount, DiscountPer, DiscountAmount, TotalAmount) VALUES (${c+1}, '${dish.DishName}', '${dish.Rate}', '${dish.DishCount}', '${dish.Rate}', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, '${dish.TotalAmount}');INSERT INTO TempRestaurantPOS_OrderedProductKOT (TicketID, Dish, Rate, Quantity, Amount, VATPer, VATAmount, STPer, STAmount, SCPer, SCAmount, DiscountPer, DiscountAmount, TotalAmount, T_Number) VALUES (${c+1}, '${dish.DishName}', '${dish.Rate}', '${dish.DishCount}', '${dish.Rate}', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, '${dish.TotalAmount}', '${req.body.TableNo}');`;
		});
		await pool.request().query(query2);
	}).catch((err) => {
		return res.json(err);
	});
	res.send(true);
});

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
		// var query2 = `SELECT r.UserID, t.id, t.TicketNo, t.GrandTotal, t.TableNo  FROM Registration as r JOIN TempRestaurantPOS_OrderInfoKOT as t ON r.UserID = '${UserID}' AND t.Operator = '${UserID}';`;
		var query2 = `SELECT r.UserID, t.id, t.TicketNo, t.GrandTotal, t.TableNo  FROM Registration as r JOIN TempRestaurantPOS_OrderInfoKOT as t ON RTRIM(r.UserID) = '${UserID}' AND RTRIM(t.Operator) = '${UserID}';`;
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
		// var S1 = [];
		// var S2 = [];
		// var S3 = [];
		// records.forEach((floor) => {
		// 	var f = floor.Floor;
		// 	delete floor.Floor;
		// 	if(f === "S1") {
		// 		S1.push(floor);
		// 	} else if(f === "S2"){
		// 		S2.push(floor);
		// 	} else if(f === "S3"){
		// 		S3.push(floor);
		// 	}
		// });
		// var all = [{S1},{S2},{S3}];
		// res.json(all);
		var S1 = {"FloorName": "S1", "Tables": []};
		var S2 = {"FloorName": "S2", "Tables": []};
		var S3 = {"FloorName": "S3", "Tables": []};
		records.forEach((floor) => {
			var f = floor.Floor;
			delete floor.Floor;
			if(f === "S1") {
				S1.Tables.push(floor);
			} else if (f === "S2") {
				S2.Tables.push(floor);
			} else if (f === "S3") {
				S3.Tables.push(floor);
			}
		});
		var all = [S1,S2,S3];
		return res.json(all);
	}).catch((err) => {
		res.json(err);
	});
});

app.get('/categories', (req, res) => {
	sql.close();
/*select c.CategoryName, c.BackColor, c.Cat_ID, cs.SubCategory, cs.BackColor from Category AS c JOIN CategorySub AS cs ON c.CategoryName = cs.Category JOIN Dish AS d ON cs.SubCategory = d.SubCategory JOIN DishModifierASsignment AS dma ON d.Discount = dma.DishName JOIN DishModifier AS dm ON dma.ModifierCategory = dm.Category;
select c.CategoryName, c.BackColor as CategoryBackColor, c.Cat_ID, cs.SubCategory, cs.BackColor as CategorySubBackColor, d.DishName, d.Rate, d.TakeAwayRate, d.DeliveryRate, dma.ModifierCategory, dm.Modifier, dm.Price  from Category AS c JOIN CategorySub AS cs ON c.CategoryName = cs.Category JOIN Dish AS d ON cs.SubCategory = d.SubCategory JOIN DishModifierASsignment AS dma ON d.DishName = dma.DishName JOIN DishModifier AS dm ON dma.ModifierCategory = dm.Category;*/
var query = `select c.CategoryName, c.BackColor as CategoryBackColor, c.Cat_ID, cs.SubCategory, cs.BackColor as CategorySubBackColor from Category AS c LEFT JOIN CategorySub AS cs ON RTRIM(c.CategoryName) = RTRIM(cs.Category);`;
var category = [];
sql.connect(DbConnectionString).then((pool) => {
	return pool.request()
	.query(query);
}).then((result) => {
	var records = result.recordset;
	var prev = "";
	var i = -1;
	records.forEach((record) => {
		i++;
		if(record.Cat_ID == prev) {
			i--;
			category[i].SubCategory.push({
				"SubCategoryName": record.SubCategory,
				"BackColor": record.CategorySubBackColor
			});
		} else {
			if(record.SubCategory === null) {
				// console.log(record.SubCategory);
				category.push({
					"CategoryName": record.CategoryName,
					"BackColor": record.CategoryBackColor,
					"Cat_ID": record.Cat_ID,
					"SubCategory": []
				});
			} else {
				category.push({
					"CategoryName": record.CategoryName,
					"BackColor": record.CategoryBackColor,
					"Cat_ID": record.Cat_ID,
					"SubCategory": [{
						"SubCategoryName": record.SubCategory,
						"BackColor": record.CategorySubBackColor
					}]
				});
			}
		}
		prev = record.Cat_ID;
	});
	res.json(category);
// res.json(result.recordset);	
}).catch((err) => {
	res.json(err);
});
});

app.post('/dishes', (req, res) => {
	sql.close();
	var type = req.body.type;
	var title = req.body.title;
	var query = "";
	// var query = `select d.Category ,d.DishName, d.Rate, d.TakeAwayRate, d.DeliveryRate, dma.ModifierCategory, dm.Category, dm.Modifier, dm.Price from Dish as d FULL JOIN DishModifierAssignment as dma ON d.DishName = dma.DishName LEFT JOIN DishModifier as dm on (dma.ModifierCategory = dm.Category OR dma.ModifierCategory = dm.Modifier);`;
	if(type === "0") {
		query = `select d.DishName, d.Rate, d.TakeAwayRate, d.DeliveryRate, dma.ModifierCategory, dm.Category, dm.Modifier, dm.Price from Dish as d FULL JOIN DishModifierAssignment as dma ON d.DishName = dma.DishName FULL JOIN DishModifier as dm on (dma.ModifierCategory = dm.Category OR dma.ModifierCategory = dm.Modifier) WHERE d.Category = '${title}';`
		
	} else {
		query = `select d.DishName, d.Rate, d.TakeAwayRate, d.DeliveryRate, dma.ModifierCategory, dm.Category, dm.Modifier, dm.Price from Dish as d FULL JOIN DishModifierAssignment as dma ON d.DishName = dma.DishName FULL JOIN DishModifier as dm on (dma.ModifierCategory = dm.Category OR dma.ModifierCategory = dm.Modifier) WHERE d.SubCategory = '${title}';`;
	}
	var dishes = [];
	sql.connect(DbConnectionString).then((pool) => {
		return pool.request()
		.query(query);
	}).then((result) => {
		var records = result.recordset;
		var prevDishName = "";
		var prevModifierCategory = "";
		var i = -1;
		var j = 0;
		var k = 0;
		records.forEach((record) => {
			i++;
			if(record.DishName === prevDishName) {
				i--;
				if(record.ModifierCategory === prevModifierCategory && record.ModifierCategory != null) {
					// console.log("ModifierCategory: "+record.ModifierCategory+" Prev: "+prevModifierCategory+" Modifier: "+record.Modifier);
					dishes[i].DishModifierAssignments[j].Modifiers.push({
						"ModifierName": record.Modifier,
						"Price": record.Price
					});
					// console.log("j: "+j+"  "+JSON.stringify(dishes[i].DishModifierAssignments[j]));
				} else {
					j++;
					dishes[i].DishModifierAssignments.push({
						"AssignmentName": record.ModifierCategory,
						"Modifiers": [{
							"ModifierName": record.Modifier,
							"Price": record.Price
						}]
					});
				}
				prevModifierCategory = record.ModifierCategory;
			} else {
				j = 0;
				if(record.ModifierCategory === null) {
					dishes.push({
						"DishName": record.DishName,
						"Rate": record.Rate,
						"TakeAwayRate": record.TakeAwayRate,
						"DeliveryRate": record.DeliveryRate,
						"DishModifierAssignments": []
					});
				} else {
					dishes.push({
						"DishName": record.DishName,
						"Rate": record.Rate,
						"TakeAwayRate": record.TakeAwayRate,
						"DeliveryRate": record.DeliveryRate,
						"DishModifierAssignments": [{
							"AssignmentName": record.ModifierCategory,
							"Modifiers": [{
								"ModifierName": record.Modifier,
								"Price": record.Price
							}]
						}]
					});
				}
				prevModifierCategory = record.ModifierCategory;
			}
			prevDishName = record.DishName;
		});
		res.json(dishes);
		// res.json(result);
	}).catch((err) => {
		res.json(err);
	})
});

app.listen(port, function() {
	console.log(`node server listening at port : ${port}`);
});