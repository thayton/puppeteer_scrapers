'use strict';

const puppeteer = require('puppeteer');
const url = require('url');

const Company = {
    name: 'Florida State University',
    hq: 'Tallahassee, FL',
    home_page: 'http://www.fsu.edu',
    jobs_page: 'https://jobs.omni.fsu.edu/psc/sprdhr_er/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=1'
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* https://github.com/GoogleChrome/puppeteer/issues/1361#issuecomment-343748051 */
async function waitForFrame(page, name) {
    let fulfill;
    const promise = new Promise(x => fulfill = x);
    checkFrame();
    return promise;

    async function checkFrame() {
        const frame = await page.frames().find(f => f.name() === name);
        if (frame) {
            fulfill(frame);
        } else {
            page.once('frameattached', checkFrame);
        }
    }
}

const getJobLinks = async (page) => {
    const viewAllJobs = await page.$('a#NAV_PB\\$1');
    await viewAllJobs.click();

    // Job listing IDs have form HRS_AGNT_RSLT_I$0_row_0
    await page.waitForFunction(() => {
        return Array.from(document.querySelectorAll('li[id^="HRS_AGNT_RSLT_I\\$"]')).filter(function(e) {
            return /^HRS_AGNT_RSLT_I\$\d+_row_\d+$/.test(e.id);
        }).length > 0;
    }, {});

    const jobs = [];
    const firstJobLink = await page.$('li[id^="HRS_AGNT_RSLT_I\\$"]');
    await firstJobLink.click();

    /* Wait for page to load */
    await page.waitFor('div#win0divDERIVED_HRS_CG_HRS_GRPBOX_02');
    
    const j = {};
    j.title = await page.$eval('span#HRS_SCH_WRK2_POSTING_TITLE', span => span.innerText);
    j.location = await page.evaluate(() => $('span#HRS_SCH_WRK_HRS_DESCRLONG').text())
    j.description = await page.evaluate(() => $('div#win0divDERIVED_HRS_CG_HRS_GRPBOX_02').html());

    /*
     * To get the URL, we click into the 'Email this job' page and take the link they list on there
     */
    const emailThisJob = await page.$('a[id^="HRS_SCH_WRK_HRS_CE_EML_FRND"]');
    await emailThisJob.click();
    
    /* 
     * Wait for Email Job page to load within iframe
     */
    await page.waitForFunction((text) => {
        return Array.from(document.querySelectorAll('iframe'))
            .map(iframe => iframe.contentWindow.document.querySelector('title').innerText)
            .filter(e => e === 'Email Job')
            .length > 0;
    }, {}, 'Email Job'
    );

    /* Grab the URL from the text of the email */
    j.url = await page.evaluate(() => {
        $('#HRS_EMLFRND_WRK_HRS_CRSP_MSG').contents().filter(function() {
            return this.nodeType == 3 && /jobs\.omni\.fsu/.test($(this).text());
        }).text();
    });

    /*
     * Now click cancel to get back to the description page so we can move onto the
     * next job
     */
    const cancelBtn = await page.$('a#HRS_APPL_WRK_HRS_CANCEL_BTN')
    await cancelBtn.click();
    await page.waitFor('div#win0divDERIVED_HRS_CG_HRS_GRPBOX_02');

    /*
     * Click onto the Next Job until we've gone through them all..
     */
    const nextJob = await page.$('a#DERIVED_HRS_FLU_HRS_NEXT_PB');
    await nextJob.click();
    await page.waitFor('div#win0divDERIVED_HRS_CG_HRS_GRPBOX_02');    
};

const getJobs = async (page) => {

};

const main = async () => {
    const browser = await puppeteer.launch({ slowMo: 250, headless: false, devtools: true });
    const page = await browser.newPage();

    await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.min.js'}); // Inject jQuery    
    await page.goto(Company.jobs_page);
    
    await page.waitForFunction(
        text => text === document.querySelector('a#NAV_PB\\$1 > span.ps-text').innerText,
        {}, 'View All Jobs'
    );
    
    const jobs = await getJobLinks(page);

    await page.close();
    await browser.close();
};

main().then((jobs) => {
    console.log(JSON.stringify(jobs, null, 2));
});
