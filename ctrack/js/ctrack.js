// Copyright (c) 2014 International Aid Transparency Initiative (IATI)
// Licensed under the MIT license whose full text can be found at http://opensource.org/licenses/MIT

var ctrack=exports;

var plate=require("./plate.js")
var iati=require("./iati.js")
var fetch=require("./fetch.js")
var savi=require("./savi.js")
var chart=require("./chart.js")

var views=require("./views.js");

var ganal=require("./ganal.js");

var iati_codes=require("../../dstore/json/iati_codes.json")

// exports
ctrack.savi_fixup=savi.fixup;
ctrack.draw_chart=chart.draw;

ctrack.get_chart_data=function(name)
{
		return ctrack.chunk(name) || [];
};

ctrack.sortby="order";
ctrack.dosort=function(s)
{
	if(ctrack.sortby==s) { s="-"+s; } // reverse on second click
	ctrack.sortby=s;
	if(ctrack.last_view)
	{
		var v=views[ctrack.last_view.toLowerCase()]
		if(v && v.display)
		{
			v.display();
		}
	}
};

ctrack.setup=function(args)
{
	ctrack.q={};
	window.location.search.substring(1).split("&").forEach(function(n){
		var aa=n.split("=");
		ctrack.q[aa[0]]=aa[1];
	});
	
	args=args || {};
	args.jslib	=args.jslib 	|| "http://d-portal.org/jslib/"; // load stuff from here
	args.tongue	=args.tongue 	|| 	"eng"; 		// english
	args.art	=args.art 		|| 	"/art/"; 	// local art
	args.q		=args.q 		|| 	"/q"; 		// local q api
	
	args.flavas=args.flavas || ["original","high"];
	args.flava=args.flava || ctrack.q.flava || "original";

	args.css=args.css || [
			args.art+args.flava+"/activities.css",
			args.art+args.flava+"/ctrack.css"
		];

	if(args.css) { head.load(args.css); }
	
	ctrack.args=args;
	
	if(args.publisher)
	{
		ctrack.crumbs=[{hash:"#view=publisher",view:"publisher"}];
	}
	else
	{
		ctrack.crumbs=[{hash:"#view=main",view:"main"}];
	}
	ctrack.setcrumb=function(idx)
	{
// try not to leave holes in the crumbs list, so align to left
		if(idx > ctrack.crumbs.length ) { idx=ctrack.crumbs.length; }
		
		var it={};
		ctrack.crumbs=ctrack.crumbs.slice(0,idx);
		ctrack.crumbs[idx]=it;
		it.hash=ctrack.last_hash;
		it.view=ctrack.last_view;
	};
	ctrack.show_crumbs=function()
	{
		for(var i=0;i<ctrack.crumbs.length;i++)
		{
			var v=ctrack.crumbs[i];
			if(v)
			{
				ctrack.chunk("crumb"+i+"_hash",v.hash);
				ctrack.chunk("crumb"+i+"_view",v.view);
			}
			else
			{
				if(args.publisher)
				{
					ctrack.chunk("crumb"+i+"_hash","#view=publisher");
					ctrack.chunk("crumb"+i+"_view","publisher");
				}
				else
				{
					ctrack.chunk("crumb"+i+"_hash","#view=main");
					ctrack.chunk("crumb"+i+"_view","main");
				}
			}
		}
		ctrack.chunk("crumbs","{crumbs"+ctrack.crumbs.length+"}");
	}


// temporary country force hack
	if( ctrack.q.country )
	{
		args.country=ctrack.q.country.toLowerCase();
		args.chunks["country_code"]=args.country.toUpperCase();
		args.chunks["country_name"]=iati_codes.country[args.country.toUpperCase()];
		args.chunks["country_flag"]="{art}flag/"+args.country+".png";
		args.chunks["background_image"]="{art}back/"+args.country+".jpg";
	}
	else
	{
		args.chunks["main_countrymin"]="";
		args.chunks["main_country"]="";
		args.chunks["main_country_head"]="";
		args.chunks["country_name"]="";
		args.chunks["back_country"]="";
	}

	if( ctrack.q.tongue ) // choose a new tongue
	{
		args.tongue=ctrack.q.tongue;
	}

	if( ctrack.q.publisher )
	{
		args.publisher=ctrack.q.publisher; // case is important?
		args.chunks["publisher_code"]=args.publisher;
		args.chunks["publisher_name"]=iati_codes.publisher_names[args.publisher] || args.publisher;
	}
	else
	{
		args.chunks["main_pubmin"]="";
		args.chunks["main_publisher"]="";
		args.chunks["main_publisher_head"]="";
		args.chunks["publisher_name"]="";
		args.chunks["back_publisher"]="";
	}
	
	ctrack.chunks={};
	if( args.tongue!="non" ) // use non as a debugging mode
	{
		plate.push_namespace(require("../json/eng.json")); // english fallback for any missing chunks

		var tongues=require("../json/tongues.js"); // load all tongues
		var tongue=tongues[ args.tongue ];
		if(tongue){plate.push_namespace(tongue);} // translation requested
	}
	plate.push_namespace(require("../json/chunks.json")); //the main chunks
	if(args.chunks)
	{
		plate.push_namespace(args.chunks); // override on load
	}
	plate.push_namespace(ctrack.chunks); // the data we create at runtime

// set or get a chunk in the ctrack namespace
	ctrack.chunk=function(n,s){
		if( s !== undefined )
		{
			ctrack.chunks[n]=s;
		}
		return ctrack.chunks[n];
	};
	ctrack.chunk_clear=function(n){
			ctrack.chunks[n]=undefined;
	};
// set global defaults
	ctrack.chunk("art",args.art);
	ctrack.chunk("flava",args.art+args.flava+"/");
	ctrack.chunk("flava_name",args.flava);
	ctrack.chunk("tongue",args.tongue);

	ctrack.div={};

	ctrack.div.master=$(ctrack.args.master);
	ctrack.div.master.empty();
	ctrack.div.master.html( plate.replace("{loading}")  );
	
	
	ctrack.chunk("today",fetch.get_today());
	ctrack.chunk("hash","");
	
// build ? strings for url changes

	var aa={}
	if(args.flava!="original") { aa["flava"]=args.flava; }
	if(args.tongue!="eng") { aa["tongue"]=args.tongue; }
	if(ctrack.q.country) { aa["country"]=ctrack.q.country; }

	var bb=[]; for(var n in aa) { bb.push(n+"="+aa[n]); }
	ctrack.chunk("mark","?"+bb.join("&"));

	var bb=[]; for(var n in aa) { if(n!="tongue") { bb.push(n+"="+aa[n]); } }
	ctrack.chunk("mark_no_tongue","?"+bb.join("&"));

	var bb=[]; for(var n in aa) { if(n!="flava") { bb.push(n+"="+aa[n]); } }
	ctrack.chunk("mark_no_flava","?"+bb.join("&"));

 
	ctrack.hash={};
	ctrack.hash_split=function(q,v)
	{
		if(q[0]=="#") { q=q.substring(1);}
		v=v;
		var aa=q.split("&");
		aa.forEach(function(it){
			var bb=it.split("=");
//console.log(bb);
			if( ( "string" == typeof bb[0] ) && ( "string" == typeof bb[1] ) )
			{
				v[ bb[0] ] = decodeURIComponent(bb[1]) ;
			}
		});
		return v;
	}


	ctrack.view_done={};
	ctrack.show_view=function(name)
	{
		if(name)
		{
			name=name.toLowerCase();
			var v=views[name];
			if(v && v.view)
			{
				v.view();
			}
			ganal.view(); // record view action
		}
	}

	if(args.publisher)
	{
		ctrack.hash={"view":"publisher"};
	}
	else
	{
		ctrack.hash={"view":"main"};
	}
	ctrack.display_wait=0;
	ctrack.display=function()
	{
//console.log(ctrack.display_wait);
		ctrack.display_wait--;
		if(ctrack.display_wait<=0)
		{
			ctrack.display_wait=0;
			ctrack.change_hash();
		}
	}
	ctrack.change_hash=function(h)
	{
		if(h)
		{
			ctrack.hash={};
			for(var n in h)
			{
				ctrack.hash[n]=h[n];
			}
		}
		ctrack.last_hash="";
		ctrack.display_hash();
		ctrack.check_hash();
	}
	ctrack.display_hash=function()
	{
		var a=[];
		for(var n in ctrack.hash)
		{
			a.push(n+"="+encodeURIComponent(ctrack.hash[n]));
		}
		document.location.hash=a.join("&");
	}
	ctrack.last_hash="";
	ctrack.last_view="";
	ctrack.check_hash=function()
	{
		var h=document.location.hash;
		if(h!=ctrack.last_hash)
		{
			ctrack.chunk("hash",h);
			ctrack.last_hash=h;
			var l={};
			ctrack.hash=ctrack.hash_split(h,l);
			
			var change_of_view=false;
			if(ctrack.last_view!=l.view) // scroll up when changing views
			{
				change_of_view=true;
				ctrack.last_view=l.view;
				$("html, body").bind("scroll mousedown DOMMouseScroll mousewheel keyup", function(){
					$('html, body').stop();
				});
				$('html, body').animate({ scrollTop:0 }, 'slow', function(){
					$("html, body").unbind("scroll mousedown DOMMouseScroll mousewheel keyup");
				})
				
				ctrack.show_view(l.view);
//console.log("new view");
   			}

//console.log("displaying view");

			ctrack.show_crumbs();

// these are now view hooks
			var name=l.view;
			if(name)
			{
				name=name.toLowerCase();
				var v=views[name];
				if(v && v.show)
				{
					v.show(change_of_view); // special fill
				}
				else // default fill
				{
					ctrack.div.master.html( plate.replace( "{view_"+l.view+"}" ) );
				}
				if(v && v.fixup)
				{
					v.fixup();
				}
			}
		}
	};
	$(window).bind( 'hashchange', function(e) { ctrack.check_hash(); } );

// wait for images to load before performing any data requests?
	for(var n in views)
	{
		var v=views[n];
		if(typeof v == "object")
		{
			if(v.setup)
			{
//				console.log("setup "+n);
				v.setup(); // perform initalization of all views
			}
		}
	}
	ctrack.check_hash();
	ctrack.display_hash(); // this will display view=main or whatever page is requsted

}

