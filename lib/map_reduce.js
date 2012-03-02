/**
 * (extended jsutil from script gallery by mghunt@gmail.com)
 * execute JavaScript in a cell (inspired by js.io package management -- http://js.io/)
 *  - the last argument is a string of JavaScript
 *  - the first arguments are available in the JavaScript as $0, $1, ..., $n
 *  - all arguments are available in the JavaScript in an array called $
 * in a spreadsheet cell:
 *  =js(1, 2, 3, "$0 + $1 + $2") -> 6
 *  =js(1, 2, 3, "sum($)" -> 6
 *  =js(A:A, B:B, "...", "trim") -> will enable auto trim of each parameter. 
 *    That way A:A and B:B will be cleared of empty cells
 *  =js(A1:A10, "$.join()") -> concatenates the values of cells A1-A10 in a comma-separated list
 *  =js(A1:A15, B1:B10, C1:D10 "leftjoin($1, $2, $3)") -> for each value in A1-A15 finds an appripriate value in B1-B10 
 *    and insert values from correspondin Cn-Dn.
 *    if $3 is empty - $2 will be used.
 *  =js(A1:A10, "sum(map($, int))" -> takes string values, runs parseInt on them, and then sums them
 */
function mr() {
  var _ = {$: _array(arguments)};

  var autoTrim = _.$.slice(-1)=="trim";
  if(autoTrim){_.$.pop()}

  _.src = _block2function(_.$.pop());
  
  _.$.map(function(a,b){if(autoTrim){a=trim(a)};return _['$'+b]=a});

  try {
    return eval('with(_){delete _;' + _.src + '}');
  } catch(e) {
    return e.message;
  }
}

/**
 * some useful array functions
 */
function trim(a) { if(2==1){return a.length+" "+a[0].length}; while(a[0]==""){a.shift()};while(a[a.length-1]==""){a.pop()}; return a; }
function merge() { 
  var maxRows = SpreadsheetApp.getActiveSheet().getMaxRows();
  var r = merge_.apply(this, arguments);
  if ( r.length > maxRows*0.66 ) { 
    SpreadsheetApp.getActiveSpreadsheet().toast("Your merge formula result size is bigger that 66% of the current spreadsheet length. Maybe you use trim?", "wrong merge?", 5);
    return "<ERROR : Your merge formula result size is bigger that 66% of the current spreadsheet length. Maybe you use trim?>";
  }
  return r;
}
function merge_() { 
  var args=_array(arguments);
  if(args.length==1){args=args[0]};
  return args.reduce(function(r, v){return r.concat(v)},[]);
} // combine multiple arrays

function leftjoin(aa, ab, ac){
  ac = ac || ab;
  var index = ab.reduce(function(r,v,i){r[v]=i;return r},[]); //index all 
  return aa.map(function(v,i){return ac[index[v]]})
}


// turn the array 90 degres. x*y array into y*x
function transpose(array){
  if ( array === undefined ) {return undefined};

  var tmp=[];
  if ( array[0] === undefined || array[0].forEach === undefined ) {array=[array]}
  var ny=array[0] && array[0].length;
  var nx=array.length;

  tmp.length=ny;
  
  for(var y=0; y<ny; y++) {
    var line=tmp[y]=[];
    line.length=nx;
    for(var x=0; x<nx; x++) {
      tmp[y][x]=array[x][y];
    }
  }
  
  // copy the tmp back
  array.length=tmp.length;
  for(var y=0; y<ny; y++) {
    array[y]=tmp[y];
  }

  return array;
}

// create all the vertical functions for all the horizontal ones
// for that matter the following happens:
// - array is tranposed;
// - the original function runs on top of it;
// - the result is transposed;
// - the array itself is transposed;
// @TOOD - currently it doesn't really work. Transpose creates a new array - vs changes the current one.
eval(
  ["concat", "every", "filter", "forEach", "indexOf", "join", "lastIndexOf", "length", "map", "pop", 
   "push", "reduce", "reduceRight", "reverse", "shift", "slice", "some", "sort", "splice", "unshift"].reduce(function(r,v){
     return r+="function v"+v+"(array){\
       var args=_array(arguments);\
       args.shift();\
       var t=transpose(array);\
       var r=transpose(t."+v+".apply(t, args));\
       t=transpose(array);\
       return r;\
     };\
     function vt"+v+"(){return transpose(v"+v+".apply(this, arguments))}\
     ";
  },"")
)


// ? why are they here if you can do array.filter(f), or array.reduce(f)
function sum(array) { return reduce(array, function(sum, value) { return sum + (value || 0); }, 0); }
function map(array, f) { return array.map(f); }

function filter(array, f){ return array.filter(eval(f)); }
function unique(array){ var u=[];r=array.filter(function(v){ var r=u[v];u[v]=true;return r===undefined });delete u;return r }
function reduce(array, f, initial) {
  var result = initial || 0;
  array.map(function(value) { result = f(result, value); });
  return result;
}


//

// match str against expr and replace the entire string with sub
//  e.g. rereplace("hello world!", "(h.*?)o w(.)", "$1$2") -> "hello"
function rereplace(str, expr, sub, opts) {
  var result = String(str).match(new RegExp(expr, opts));
  if (!result) { return ''; }
  var max = result.length;
  return sub.replace(new RegExp("\\$(\\d+|\\$)", "g"), function(match, index) {
    if (index == '$') { return '$'; }
    index = parseInt(index);
    return !isNaN(index) && index < max && result[index] || match;
  });
}

// match str against expr and replace each match with sub
//  e.g. resub("a1 a2 a3 a4 a5", "a(\d)", "$1b") -> 1b 2b 3b 4b 5b
function resub(str, expr, sub, opts) {
  return String(str).replace(new RegExp(expr, opts || "g"), sub);
}

/** 
 * round the number n to precision p
 *  e.g. round(0.5456) -> 1, round(0.5456, 2) -> .55
 * @param {float} n - floating-point value
 * @param {int} p - precision
 */
function round(n, p) {
  if(!p) return Math.round(n);
  var a=n|0,b=n-a,c=Math.pow(10,p);
  return a+(b*c|0)/c;
}

/**
 * wrapper for parseInt which works with map
 * (parseInt doesn't work with map because map passes an index too,
 *  changing the base that parseInt is working in)
 * @param {Object} value - usually a number or string
 */
function int(value) { return parseInt(value); }


// used to convert arguments to an Array
_array = function() { var slice = Array.prototype.slice; return function(a) { return slice.call(a); }}();

// created ability to use short tonation in methods like 
//  $0.map({|v,i| return v+1}
//  vs.
//  $0.map(function(v,i){return v+1}
// also makes it easier to read
_block2function = function(s) { return s.replace(/\{[ \t\n]*\|([^\|]+)\|/g, "function($1){") }
