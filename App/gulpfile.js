var gulp = require('gulp'),
	merge = require('merge-stream'),
	sass = require('gulp-sass'),
	cleanCSS = require('gulp-clean-css'),
	rename = require("gulp-rename"),
	cfg = require('./build.config.json'),
	inject = require('gulp-inject'),
	del = require('del'),
	runSequence = require('run-sequence'),
	jshint = require('gulp-jshint'),
	browserSync = require('browser-sync').create(),
	uglify = require('gulp-uglify'),
	concat = require('gulp-concat'),
	gutil = require('gulp-util'),
	closureCompiler = require('gulp-closure-compiler'),
	foreach = require('gulp-foreach');
	var path = require('path');
var ngAnnotate = require('gulp-ng-annotate');
var babel = require('gulp-babel');
var reload      = browserSync.reload;

var paths = {
  sass: ['./src/**/*.scss']
};


gulp.task('connect',['build-dev'], function(){
	browserSync.init({
		host: '192.168.1.128',
		server: {
			baseDir: "./build"
		}
	})
});
gulp.task('connect-product',['build-product'], function(){
	browserSync.init({
		server: {
			baseDir: "./build"
		}
	})
});

gulp.task('sass', function(done){
	return gulp.src('./src/sass/app.scss')
		.pipe(sass({
			erroLogToConsole: true
		}))
		.pipe(gulp.dest('./build/css/'))
		.pipe(browserSync.stream())
		.pipe(cleanCSS({
			keepSpecialComments: 0
		}))
		.pipe(rename({extname: '.min.css'}))
		.pipe(gulp.dest('./build/css/'))
		.pipe(browserSync.stream());
});

gulp.task('watch', function() {
	gulp.watch(paths.sass, ['sass']);
});


function copyVendor3rd(){
	return  gulp.src(cfg.vendor3rd_files,  { cwd : './vendor3rd/**'})
	.pipe(gulp.dest('./build/lib'));
}
function copyVendor(){
	return  gulp.src(cfg.vendor_files,  { cwd : './vendor/**'})
	.pipe(gulp.dest('./build/lib'));
}
function copyApp(done){
	return gulp.src(cfg.app_files,{ cwd : './src/**'})
	.pipe(gulp.dest('./build'));
}
function copyAppProduct(done){
	return gulp.src(cfg.product_app_files,{ cwd : './src/**'})
	.pipe(gulp.dest('./build'));
}
function copyFont(){
	return gulp.src(cfg.app_files,{ cwd : './src/fonts/**'})
	.pipe(gulp.dest('./build/fonts'));
}

function rsLint(){
	return gulp.src(cfg.need_jshint_files)
	.pipe(jshint({esversion: 3}))
	.pipe(jshint.reporter('jshint-stylish'))
	.pipe(jshint.reporter('fail')); 
}
function app_inject(done){
	return  gulp.src('src/index.html')
	// inject vendor
	.pipe(
		inject(
			gulp.src(cfg.inject_vendor_js_files,{read: false}),{
				starttag: '<!-- inject:vendorjs -->',
				endtag: '<!-- endinject: vendorjs -->',
				transform: function(filePath, file){
					//console.log(filePath);
					var path = filePath.replace('vendor3rd', 'lib').replace('vendor', "lib").replace('/lib/', 'lib/');;
					
					//console.log('<script src="'+path+'"></script>');
					return '<script src="' + path + '"></script>';
				}
			}
		)
	)
	// inject app js files
	.pipe( 
		inject(
			gulp.src(cfg.inject_app_files, {read: false}),{
				starttag: '<!-- inject:appjs -->',
				endtag: '<!-- endinject: apjs -->',
				transform: function(filePath, file){
					var path = filePath.replace('/src/', '');
					return '<script src="'+path+'"></script>';
				}
			}	
		)
	)

	.pipe(gulp.dest('build/'));
}
function product_app_inject(done){
	return gulp.src('src/index.html')
	// inject vendor
	.pipe(
		inject(
			gulp.src(cfg.inject_vendor_js_files,{read: false}),{
				starttag: '<!-- inject:vendorjs -->',
				endtag: '<!-- endinject: vendorjs -->',
				transform: function(filePath, file){
					//console.log(filePath);
					var path = filePath.replace('vendor3rd', 'lib').replace('vendor', "lib").replace('/lib/', 'lib/');
					
					//console.log('<script src="'+path+'"></script>');
					return '<script src="' + path + '"></script>';
				}
			}
		)
	)
	// inject app js files
	.pipe( 
		inject(
			gulp.src(['build/app.js'], {read: false}),{
				starttag: '<!-- inject:appjs -->',
				endtag: '<!-- endinject: apjs -->',
				transform: function(filePath, file){
					var path = filePath.replace('/build/', '');
					path = path+'?b='+cfg.buildVersion;
					return '<script src="'+path+'"></script>';
				}
			}	
		)
	)
	.pipe(gulp.dest('build/'));
}
gulp.task('copy-vendor3rd', copyVendor3rd);
gulp.task('copy-vendor', copyVendor);
gulp.task('copy-fonts', copyFont);
gulp.task('clean-lib', function(){
	return del(['./build/lib/**']);
});
gulp.task('copy-app', copyApp);
gulp.task('copy-app-product', copyAppProduct);

gulp.task('clean', function(){
	return del(['./build/**']);
});
gulp.task('copy-lib',['clean-lib'],function(){
	copyVendor();
	copyVendor3rd();
});

gulp.task('inject', app_inject);
gulp.task('product_inject', product_app_inject);
gulp.task('rsLint', function(){
	return gulp.src(cfg.need_jshint_files)
	.pipe(jshint())
	.pipe(jshint.reporter('jshint-stylish'))
	.pipe(jshint.reporter('fail')); 
});

gulp.task('build-dev', function(done){
	return runSequence(
	'clean',
	['rsLint','sass'],
	['copy-vendor','copy-vendor3rd','copy-app', 'copy-fonts','inject'],done);
});
gulp.task('compress', function(done){
	var p =  gulp.src(cfg.inject_app_files/*["src/app/employee/add_edit/edit-employee.js"]*/)
    .pipe(closureCompiler({
      compilerPath: 'node_modules/google-closure-compiler/compiler.jar',
      fileName: 'app.js',
      compilerFlags: {
      	compilation_level: 'SIMPLE_OPTIMIZATIONS',
      	jscomp_off: 'suspiciousCode',
      	warning_level: 'QUIET',
      	angular_pass: true
      }
    }));
    p = p.pipe(gulp.dest('./build/'));
    return p;
});
gulp.task('compress-dmodules', function(done){

	var l = cfg.inject_app_files.length, src = ['./app/**/**.js'];

	for(var i = 0; i<l; i++){
		src.push('!'+ cfg.inject_app_files[i].replace('src/',''));
	}
	// return gulp.src(src)
	// .pipe(foreach(function(stream, file){
	// 	var fileName = path.basename(file.path),
	// 		fileRel = file.path.replace(file.cwd+'/src/', ''),
	// 		filePath = fileRel.replace(fileName,'');
	// 	return stream
	// 	.pipe(closureCompiler({
	// 		compilerPath: 'node_modules/google-closure-compiler/compiler.jar',
	// 		fileName: fileName,
	// 		compilerFlags: {
	// 	      	compilation_level: 'SIMPLE_OPTIMIZATIONS',
	// 	      	jscomp_off: 'suspiciousCode',
	// 	      	warning_level: 'QUIET',
	// 	      	angular_pass: true
	// 	    }
	// 	}))
	// 	.pipe(gulp.dest('./build/'+filePath)); 
	// }));
	return gulp.src(src, { cwd : './src/**'})
		.pipe(babel({
			presets: ['babel-preset-es2015']
		}))
		.pipe(ngAnnotate())
		.pipe(uglify().on('error', function(msgs, fileName, line){console.log(msgs);}))
		.pipe(gulp.dest('./build/'))
});

gulp.task('build-product', function(done){
	return runSequence(
	'clean',
	['rsLint','sass'],
	['compress'],
	['compress-dmodules'],
	['copy-vendor','copy-vendor3rd', 'copy-fonts','copy-app-product','product_inject'],
	done);
});
gulp.task('watch', function(){
	gulp.watch(['src/**/*.js','src/**/*.html','src/img/*'],['copy-app', 'inject']).on('change', reload);
	gulp.watch(paths.sass,['sass']);
})

gulp.task('watch-product', function(){
	gulp.watch(['src/**/*.js','src/**/*.html','src/img/*'],['copy-app-product', 'product_inject']).on('change', reload);
	gulp.watch(paths.sass,['sass']);
})

gulp.task('dev',['build-dev','connect','watch']);
gulp.task('product',['build-product','connect-product', 'watch-product']);
gulp.task('default',['dev', 'connect']);
