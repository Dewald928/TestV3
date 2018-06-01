// app/routes.js

// load up the user model
var mysql = require('mysql');
var dbconfig = require('../config/database');
var connection = mysql.createConnection(dbconfig.connection);

var formidable = require('formidable');
var fs = require('fs');

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
		let sql = 'INSERT INTO courses (courseName, courseDescription, userID) VALUES (?,?,?)';
		let courseName = req.body.courseName;
		let courseDesc = req.body.courseDescription;
    	let query = connection.query(sql,[courseName, courseDesc, req.user.id], (err, results) => {
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
		let sql = 'SELECT * FROM lessons,courses WHERE lessons.COURSE_FK = courses.COURSE_ID and courses.courseName = ? order by lessonNumber asc';
			let query = connection.query(sql,[req.params.courseName], (err, results2) => {
				if(err) throw err;
				// console.log(results);
				if(isEmpty(results2)) {
					if(req.user.lecturer > 0) {
						res.redirect('/profile');//*moet course object paas maar is nie een
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
	});

	// =====================================
	// Lessons =============================
	// =====================================
	app.post('/course/:courseName/addlesson', function(req, res){
		//get course id
		var form = new formidable.IncomingForm();
		form.uploadDir = "/";
		form.parse(req, function (err, fields, files) {
			var oldpath = files.filetoupload.path;
			var newpath = createMaterialPath(req.params.courseName) + '/' + files.filetoupload.name;
			fs.rename(oldpath, newpath, function (err) {
			  if (err) throw err;
			//   res.write('File uploaded and moved!');
			//   res.end();
			});

			var lessonNumber = fields.lessonNumber;
			var LESSON_NAME = fields.LESSON_NAME;
			var LESSON_DESCRIPTION = fields.LESSON_DESCRIPTION;
			var LESSON_MATERIAL = fields.LESSON_MATERIAL;
			let sql = 'SELECT COURSE_FK FROM lessons,courses WHERE lessons.COURSE_FK = courses.COURSE_ID and courses.courseName = ?';
			let query = connection.query(sql, [req.params.courseName], (err, results) => {
				if(err) throw err;
				console.log(results[0].COURSE_FK);
				var courseid = results[0].COURSE_FK;
	
				let sql = 'INSERT INTO lessons (COURSE_FK, lessonNumber, LESSON_NAME, LESSON_DESCRIPTION, LESSON_MATERIAL) VALUES (?,?,?,?,?) ';
				let query = connection.query(sql,[courseid, lessonNumber,LESSON_NAME,LESSON_DESCRIPTION,files.filetoupload.name], (err, results) => {
					if(err) throw err;				
					res.redirect('/course/'+req.params.courseName);
				});
			});		
		});


	});

	//delete clicked lesson
	app.get('/course/:courseName/deletelesson/:lesson', function(req, res){
		//get course id
		let sql = 'SELECT COURSE_FK FROM lessons,courses WHERE lessons.COURSE_FK = courses.COURSE_ID and courses.courseName = ?';
		let query = connection.query(sql, [req.params.courseName], (err, results) => {
			if(err) throw err;
			// console.log(results[0].COURSE_FK);
			var courseid = results[0].COURSE_FK;

				let sql = 'DELETE l FROM lessons l INNER JOIN courses WHERE l.COURSE_FK=courses.COURSE_ID and COURSE_FK = ? and l.lessonNumber = ?';
				var lessonNumber = parseInt(req.params.lesson);
				let query = connection.query(sql, [courseid, lessonNumber], (err, results) => {
					if(err) throw err;
					console.log(results);
					res.redirect('/profile');
				});		
		});
	});

	
	// =====================================
	// ============Gradebook================
	// =====================================
	//vir students view
	app.get('/course/:courseName/gradebook', function(req, res){
		if(req.user.lecturer > 0){
			let sql = 'SELECT * FROM users,courses,assessments,marks WHERE assessments.COURSE_FK = courses.COURSE_ID and marks.ASSESSMENT_FK = assessments.ASSESSMENT_ID and marks.STUDENT_FK = users.id	and courses.courseName = ? order by ASSESSMENT_NAME asc';
			let query = connection.query(sql, [req.params.courseName], (err, results) => {
			if(err) throw err;
			// console.log(results);
			req.flash('info', 'Flashback to reality! There goes net neutrality!');
			// res.json(results);
			res.render('gradebook.ejs', {message: req.flash('info'), marks: results, courseName:req.params.courseName}); //get marks for user
			});
		} else {
			let sql = 'SELECT * FROM marks,users,assessments,courses WHERE marks.STUDENT_FK=users.id and marks.ASSESSMENT_FK=assessments.ASSESSMENT_ID and assessments.COURSE_FK = courses.COURSE_ID and users.id = ? and courses.courseName =?';
			let query = connection.query(sql, [req.user.id, req.params.courseName], (err, results) => {
			if(err) throw err;
			// console.log(results);
			req.flash('info', 'Flashback to reality! There goes net neutrality!');
			// res.json(results);
			res.render('gradebook-student.ejs', {message: req.flash('info'), marks: results, courseName:req.params.courseName}); //get marks for user
			});
		};
		
	});

	// =====================================
	// ============Assessments==============
	// =====================================
	app.get('/course/:courseName/assessment', function(req, res){
		let sql = 'SELECT * FROM assessments,courses WHERE assessments.COURSE_FK = courses.COURSE_ID and courses.courseName =?';
    	let query = connection.query(sql, [req.params.courseName], (err, results) => {
			if(err) throw err;
			console.log(results);
			res.render('assessment.ejs', {availibleAssessments: results, courseName:req.params.courseName}); //get marks for user
		});
	});



	app.post('/course/:courseName/addAssessment', function(req, res){
		let sql = 'SELECT COURSE_ID FROM assessments,courses WHERE courses.courseName = ?';
		let query = connection.query(sql, [req.params.courseName], (err, results) => {
			if(err) throw err;
			// console.log(results[0].COURSE_FK);
			var courseid = results[0].COURSE_ID;

				let sql = 'INSERT INTO assessments (COURSE_FK, ASSESSMENT_NAME, ASSESSMENT_DESCRIPTION, ASSESSMENT_MAX_MARK) VALUES (?,?,?,?)';
				var ASSESSMENT_NAME = req.body.ASSESSMENT_NAME;
				var ASSESSMENT_DESCRIPTION =req.body.ASSESSMENT_DESCRIPTION;
				var ASSESSMENT_MAX_MARK = req.body.ASSESSMENT_MAX_MARK;
				let query = connection.query(sql, [courseid, ASSESSMENT_NAME, ASSESSMENT_DESCRIPTION, ASSESSMENT_MAX_MARK], (err, results) => {
					if(err) throw err;
					console.log(results);
					res.redirect('/course/'+req.params.courseName);
				});		
		});
	});

	//inserts marks for student on assessment
	app.post('/course/:courseName/assessment/:ASSESSMENT_ID', function(req, res){		

		let sql = 'SELECT STUDENT_FK FROM marks,users WHERE marks.STUDENT_FK = users.id and users.username = ? and marks.ASSESSMENT_FK = ?';
		let query = connection.query(sql, [field.username, req.params.ASSESSMENT_ID], (err, results) => {
			if(err) throw err;

			var STUDENT_FK = results; // moet verander
			var MARK_SCORE = fields.MARK_SCORE;
			var ASSESSMENT_ID = req.params.ASSESSMENT_ID;
			var ASSESSMENT_NAME = fields.ASSESSMENT_NAME;
			var ASSESSMENT_DESCRIPTION =fields.ASSESSMENT_DESCRIPTION;
			var ASSESSMENT_MAX_MARK = fields.ASSESSMENT_MAX_MARK;

				let query = connection.query(sql, [courseid, ASSESSMENT_NAME, ASSESSMENT_DESCRIPTION, ASSESSMENT_MAX_MARK], (err, results) => {
					if(err) throw err;
					console.log(results);
					res.redirect('/course/'+req.params.courseName);
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

function createMaterialPath(courseName){
	/*Use the existing directory to save material or create a new one*/
	var materialPath = process.cwd() + '/views/material/' + courseName;
	fs.readdir(materialPath, function (err, files) {
		if (err) {
			if (err.code === 'ENOENT') {
				fs.mkdir(materialPath,(err) => {
					if (err){
						console.log('Could not create',materialPath);
						console.log('Error:',err);
					}
					else {
						console.log('Created',materialPath);
					}
				});
			}
			else throw err;
		};
	});
	return materialPath;
}