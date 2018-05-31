// app/routes.js

// load up the user model
var mysql = require('mysql');
var dbconfig = require('../config/database');
var connection = mysql.createConnection(dbconfig.connection);

connection.query('USE ' + dbconfig.database);

module.exports = function(app, passport) {

	// =====================================
	// Courses==============================
	// =====================================
	app.get('/courses', function(req, res){
		let sql = 'SELECT * FROM courses';
    	let query = connection.query(sql, (err, results) => {
        if(err) throw err;
		// console.log(results);
			res.render('courses.ejs', {
				course : results //get courses for each user
			});
    	});
	});
	
	//adds course to user
	app.get('/courses/add/:id', function(req, res){
		// console.log(req.user.id);
		let sql = 'INSERT INTO enrollment (STUDENT_ID, COURSE_ID) VALUES (?,?)';
		let studentID = req.user.id;
		let courseid = parseInt(req.params.id);
		//*check if couse already added
    	let query = connection.query(sql,[studentID, courseid], (err, results) => {
        if(err) throw err;
		// console.log(results);
        res.redirect('/profile');
    	});
	});
	
	//get new course
	app.get('/courses/new', function(req,res){
		// console.log(req.user.lecturer);
		if(req.user.lecturer < 0){
			res.redirect('/profile');
		} else {
			res.render('courseCreate.ejs', { user: req.user });
		};
	});

	//post add new course to db
	app.post('/courses/new', function(req,res){
		// console.log(req.body);
		let sql = 'INSERT INTO courses (courseName, courseDescription) VALUES (?,?)';
		let courseName = req.body.courseName;
		let courseDesc = req.body.courseDescription;
    	let query = connection.query(sql,[courseName, courseDesc], (err, results) => {
		if(err) throw err;
			//add demo lesson
			let demo = 'demo';
			let sql = 'INSERT INTO lessons (COURSE_FK, lessonNumber, LESSON_NAME, LESSON_DESCRIPTION, LESSON_MATERIAL) VALUES (?,1,?,?,?) ';
			let query = connection.query(sql,[results.insertId, demo,demo,demo], (err, results) => {
				if(err) throw err;				
				res.redirect('/profile');
			});
    	});
	});

	app.get('/availableCourses', function(req, res){
		let sql = 'SELECT * FROM courses';
    	let query = connection.query(sql, (err, results) => {
        if(err) throw err;
		// console.log(results);
		res.json(results); //get courses for each user
    	});
	});

	// =====================================
	// Individual Courses ==================
	// =====================================
	//open individual course and it's lessons for student
	app.get('/course/:courseName', function(req,res){
		// console.log(req.params.courseName);
		//*********************should be lecturer who created the course that only he can edit******
		//select course and it's corresponding lessons
		let sql = 'SELECT LESSON_NAME, LESSON_DESCRIPTION, LESSON_MATERIAL, courseName, courseDescription FROM lessons,courses WHERE lessons.COURSE_FK = courses.COURSE_ID and courses.courseName = ? order by lessonNumber asc';
			let query = connection.query(sql,[req.params.courseName], (err, results2) => {
				if(err) throw err;
				// console.log(results);
				if(isEmpty(results2)) {
					if(req.user.lecturer > 0) {
						res.render('courseEdit.ejs');//*moet course object paas maar is nie een
					} else {
						res.redirect('/profile');
					};
				} else {
					if(req.user.lecturer > 0){
						res.render('courseEdit.ejs',{user: req.user, course: results2});
					} else {
						res.render('courseView.ejs',{user: req.user, course: results2});
					}
				};			
			});	



		// let sql = `SELECT courseName from courses,users where courses.userID = users.id and users.id = ? and courses.courseName = ?`;
		// 	let query = connection.query(sql,[req.user.id, req.params.courseName], (err, results) => {
		// 		if(err) throw err;
		// 		// console.log(results);
		// 		JSON.stringify(results);
		// 		if(results != req.params.courseName) {
		// 			let sql = 'SELECT LESSON_NAME, LESSON_DESCRIPTION, LESSON_MATERIAL, courseName, courseDescription FROM lessons,courses WHERE lessons.COURSE_FK = courses.COURSE_ID and courses.courseName = ? order by lessonNumber asc';
		// 				let query = connection.query(sql,[req.params.courseName], (err, results1) => {
		// 					if(err) throw err;
		// 					// console.log(results);
		// 					if(isEmpty(results1)) {
		// 						res.redirect('/profile');
		// 					} else {
		// 						res.render('courseView.ejs',{user: req.user, course: results1});
		// 					};			
		// 				});	
		// 		} else {
		// 			let sql = 'SELECT LESSON_NAME, LESSON_DESCRIPTION, LESSON_MATERIAL, courseName, courseDescription FROM lessons,courses WHERE lessons.COURSE_FK = courses.COURSE_ID and courses.courseName = ? order by lessonNumber asc';
		// 				let query = connection.query(sql,[req.params.courseName], (err, results2) => {
		// 					if(err) throw err;
		// 					// console.log(results);
		// 					if(isEmpty(results2)) {
		// 						res.redirect('/profile');
		// 					} else {
		// 						res.render('courseEdit.ejs',{user: req.user, course: results2});
		// 					};			
		// 				});		
		// 		};			
		// 	});		
	});

	// =====================================
	// Lessons =============================
	// =====================================
	app.post('/course/:courseName/addlesson', function(req, res){
		//get course id
		var lessonNumber = req.query.lessonNumber;
		var LESSON_NAME = req.query.LESSON_NAME;
		var LESSON_DESCRIPTION = req.query.LESSON_DESCRIPTION;
		var LESSON_MATERIAL = req.query.LESSON_MATERIAL;
		let sql = 'SELECT COURSE_FK FROM lessons,courses WHERE lessons.COURSE_FK = courses.COURSE_ID and courses.courseName = ?';
		let query = connection.query(sql, [req.params.courseName], (err, results) => {
			if(err) throw err;
			console.log(results[0].COURSE_FK);
			var courseid = results[0].COURSE_FK;

			let sql = 'INSERT INTO lessons (COURSE_FK, lessonNumber, LESSON_NAME, LESSON_DESCRIPTION, LESSON_MATERIAL) VALUES (?,?,?,?,?) ';
			let query = connection.query(sql,[courseid, lessonNumber,LESSON_NAME,LESSON_DESCRIPTION,LESSON_MATERIAL], (err, results) => {
				if(err) throw err;				
				res.redirect('/profile');
			});
		});



		
	});




	// =====================================
	// HOME PAGE (with login links) ========
	// =====================================
	app.get('/', function(req, res) {
		res.render('login.ejs', { message: req.flash('loginMessage')}); // load the index.ejs file
	});

	// =====================================
	// LOGIN ===============================
	// =====================================
	// show the login form
	app.get('/login', function(req, res) {

		// render the page and pass in any flash data if it exists
		res.render('login.ejs', { message: req.flash('loginMessage') });
	});

	// process the login form
	app.post('/login', passport.authenticate('local-login', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/login', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
		}),
        function(req, res) {
            console.log("hello");

            if (req.body.remember) {
              req.session.cookie.maxAge = 1000 * 60 * 3;
            } else {
              req.session.cookie.expires = false;
            }
        res.redirect('/');
    });

	// =====================================
	// SIGNUP ==============================
	// =====================================
	// show the signup form
	app.get('/signup', function(req, res) {
		// render the page and pass in any flash data if it exists
		res.render('signup.ejs', { message: req.flash('signupMessage') });
	});

	// process the signup form
	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/signup', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));


	// =====================================
	// PROFILE SECTION =========================
	// =====================================
	// we will want this protected so you have to be logged in to visit
	// we will use route middleware to verify this (the isLoggedIn function)
	app.get('/profile', isLoggedIn, function(req, res) {
		var mycourses ={};
		let sql = 'SELECT courseName,courseDescription FROM courses,enrollment,users WHERE courses.COURSE_ID=enrollment.COURSE_ID and enrollment.STUDENT_ID = users.id and users.id = ?';
    	let query = connection.query(sql,[req.user.id], (err, results) => {
			if(err) throw err;
			mycourses= results;

			if(isEmpty(mycourses)) {
				mycourses = "";
			} 
			res.render('profile.ejs', {
				user : req.user, // get the user out of session and pass to template
				course : mycourses //get courses for each user
			});
		});			
	});


	// =====================================
	// LOGOUT ==============================
	// =====================================
	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});
};

function isEmpty(obj) {
	for(var key in obj) {
		if(obj.hasOwnProperty(key))
			return false;
	}
	return true;
}

// route middleware to make sure
function isLoggedIn(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	// if they aren't redirect them to the home page
	res.redirect('/');
}
