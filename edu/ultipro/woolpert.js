'use strict';

const url = require('url');
const axios = require('axios');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

//
// curl 'https://recruiting.ultipro.com/WOO1009/JobBoard/97967b39-b3fa-4972-8da3-2af68e0ffa86/JobBoardView/LoadOpportunities' 
//  -H 'Cookie: __RequestVerificationToken=XqGOOUeo_9t1RMe1hs4QvFuHulh3mgIW5zmlIRiBYv246uP2r_Zqbgr6Nt6f_ZDvI6ad5sjXs1kKWFaWg_u36WBxK_01; _pendo_accountId.6807d3e4-3721-4905-5e37-29a2c65e3bc6=60d44465-2503-412c-a383-e60526177c26; _pendo_visitorId.6807d3e4-3721-4905-5e37-29a2c65e3bc6=_PENDO_T_vpaVQOq6SNm; _pendo_meta.6807d3e4-3721-4905-5e37-29a2c65e3bc6=2783511528; nonce=BFEqX5uzG1yrvZTZORijOpYaTApDEXfQuMl2Zbjfgrk' 
//  -H 'Origin: https://recruiting.ultipro.com' 
//  -H 'Accept-Encoding: gzip, deflate, br' 
//  -H 'Accept-Language: en-US,en;q=0.9' 
//  -H 'X-Requested-With: XMLHttpRequest' 
//  -H 'Connection: keep-alive' 
//  -H 'Pragma: no-cache' 
//  -H 'X-RequestVerificationToken: ycl_yS4eo6SaSXSZ5dfxB03-q9LFUM36_tJAzi4Zs-tSNV20_mvK_HGG7eIm7kEDFCYgA8h_Bwub_P5A66q6vI2Onu0-VcrdmkXM33lpH3xNwH7p74rFTtSFi78nf70OYz479Q2' 
//  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36' 
//  -H 'Content-Type: application/json; charset=UTF-8' 
//  -H 'Accept: application/json, text/javascript, */*; q=0.01' 
//  -H 'Cache-Control: no-cache' 
//  -H 'Referer: https://recruiting.ultipro.com/WOO1009/JobBoard/97967b39-b3fa-4972-8da3-2af68e0ffa86/?q=&o=postedDateDesc'
//  -H 'DNT: 1'
// --data-binary '{"opportunitySearch":{"Top":50,"Skip":0,"QueryString":"","OrderBy":[{"Value":"postedDateDesc","PropertyName":"PostedDate","Ascending":false}],"Filters":[{"t":"TermsSearchFilterDto","fieldName":4,"extra":null,"values":[]},{"t":"TermsSearchFilterDto","fieldName":5,"extra":null,"values":[]},{"t":"TermsSearchFilterDto","fieldName":6,"extra":null,"values":[]}]},"matchCriteria":{"PreferredJobs":[],"Educations":[],"LicenseAndCertifications":[],"Skills":[],"hasNoLicenses":false,"SkippedSkills":[]}}' --compressed
//

const Company = {
    name: 'Woolpert',
    hq: 'Dayton, OH',
    home_page: 'https://woolpert.com',
    jobs_page: 'https://recruiting.ultipro.com/WOO1009/JobBoard/97967b39-b3fa-4972-8da3-2af68e0ffa86/?q=&o=postedDateDesc'
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const http_get = async (url) => {
    const data = {};
    const resp = await fetch(url);
    
    data.html = await resp.text();
    
    const dom = new JSDOM(data.html);
    data.$ = (require('jquery'))(dom.window);

    return data;
};

/*
  ASPX page uses this for CSRF protection and we need to emulate it...

     $(function() {
         $('<input name="__RequestVerificationToken" type="hidden" value="AWJV4CS..." />').appendTo("body");
     });
     
     $(document).ajaxSend(function (event, xhr, options) {
         if (['GET', 'HEAD'].indexOf(options.type) === -1) {
             xhr.setRequestHeader('X-RequestVerificationToken', $('input[name="__RequestVerificationToken"]').val());
         }
     });
*/
const getJobLinks = async () => {
    let postUrl = 'https://recruiting.ultipro.com/WOO1009/JobBoard/97967b39-b3fa-4972-8da3-2af68e0ffa86/JobBoardView/LoadOpportunities';
    let payload = {
        "opportunitySearch":{
            "Top": 50,
            "Skip": 0,
            "QueryString": "",
            "OrderBy":[{"Value":"postedDateDesc","PropertyName":"PostedDate","Ascending":false}],
            "Filters":[
                {
                    "t":"TermsSearchFilterDto",
                    "fieldName":4,
                    "extra":null,
                    "values":[]
                },
                {
                    "t":"TermsSearchFilterDto",
                    "fieldName":5,
                    "extra":null,
                    "values":[]
                },
                {
                    "t":"TermsSearchFilterDto",
                    "fieldName":6,
                    "extra":null,
                    "values":[]
                }
            ]
        },
        "matchCriteria": {
            "PreferredJobs": [],
            "Educations": [],
            "LicenseAndCertifications": [],
            "Skills": [],
            "hasNoLicenses": false,
            "SkippedSkills": []
        }
    };

    /* 
     * resp.data - { opportunities: Array(20), totalCount: 66 }
     */
    const jobs = [];
    const urlObj = url.parse(
        'https://recruiting.ultipro.com/WOO1009/JobBoard/97967b39-b3fa-4972-8da3-2af68e0ffa86/OpportunityDetail?opportunityId=xxx'
        , true /* parseQueryString */
    );
    urlObj.search = null; /* so that query will be used by url.format() instead */

    let resp = await axios.get(Company.jobs_page);
    
    do {
        resp = await axios.post(postUrl, JSON.stringify(payload), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
                'Referer': 'https://recruiting.ultipro.com/WOO1009/JobBoard/97967b39-b3fa-4972-8da3-2af68e0ffa86/?q=&o=postedDateDesc',
                'X-Requested-With': 'XMLHttpRequest',
                'X-RequestVerificationToken': 'ycl_yS4eo6SaSXSZ5dfxB03-q9LFUM36_tJAzi4Zs-tSNV20_mvK_HGG7eIm7kEDFCYgA8h_Bwub_P5A66q6vI2Onu0-VcrdmkXM33lpH3xNwH7p74rFTtSFi78nf70OYz479Q2',
                'Cookie': '__RequestVerificationToken=XqGOOUeo_9t1RMe1hs4QvFuHulh3mgIW5zmlIRiBYv246uP2r_Zqbgr6Nt6f_ZDvI6ad5sjXs1kKWFaWg_u36WBxK_01;',
                'Content-Type': 'application/json; charset=UTF-8',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Origin': 'https://recruiting.ultipro.com' 
            }

        });

        resp.data.opportunities.forEach(o => {
            let j = {};
            let l = o.Locations[0].Address;

            urlObj.query.opportunityId = o.Id;
            
            j.title = o.Title;
            j.url = url.format(urlObj);
            j.location = l.City + ', ' + l.State.Name;
            
            jobs.push(j);
        });

        payload.opportunitySearch.Skip += jobs.length;
        console.log(`# jobs: ${jobs.length}`);
        
    } while (jobs.length < resp.data.totalCount);

    return jobs;
};

const main = async () => {
    const jobs = await getJobLinks();
};

main().then((jobs) => {
    jobs.forEach(
        j => console.log(JSON.stringify(j, null, 2))
    );
});
