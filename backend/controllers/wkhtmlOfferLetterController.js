import wkhtml from 'wkhtmltopdf';
import path from 'path';
import fs from 'fs';

// VERY IMPORTANT
wkhtml.command =
    'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe';

const pdfPath = "../backend/GeneratedOfferLetter";

export const generateOfferLetter = async (req, res) => {

    try {

        const {
            name,
            gender,
            internType,
            durationType,
            duration,
            role,
            startDate,
            endDate,
            salaryType,
            salaryAmount
        } = req.body;

        // Validation
        if (
            !name ||
            !gender ||
            !internType ||
            !durationType ||
            !duration ||
            !role ||
            !startDate ||
            !endDate ||
            !salaryType
        ) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        const upperName = name.toUpperCase();

        // Folder path
        const folderPath =
            path.join(process.cwd(), pdfPath);

        // Create folder if not exists
        if (!fs.existsSync(folderPath)) {

            fs.mkdirSync(folderPath, {
                recursive: true
            });
        }

        // File name
        const fileName =
            `${internType}_Letter_${upperName}.pdf`;

        // Final output path
        const outputFile =
            path.join(folderPath, fileName);

        // Images
        const templatePath = path.join(
            process.cwd(),
            'public/images/offerletter/temp.png'
        );

        const signPath = path.join(
            process.cwd(),
            'public/images/offerletter/sign2.png'
        );

        const transparentPath = path.join(
            process.cwd(),
            'public/images/offerletter/transparent.png'
        );

        // Convert paths for wkhtml
        const templateUrl =
            `file:///${templatePath.replace(/\\/g, '/')}`;

        const signUrl =
            `file:///${signPath.replace(/\\/g, '/')}`;

        const transparentUrl =
            `file:///${transparentPath.replace(/\\/g, '/')}`;

        // Date
        const inpDate = `Date: ${new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).replace(/(\d+)/, (day) => {

            const suffix =
                day > 3 && day < 21
                    ? 'th'
                    : [
                        'th',
                        'st',
                        'nd',
                        'rd',
                        'th',
                        'th',
                        'th',
                        'th',
                        'th',
                        'th'
                    ][day % 10];

            return day + suffix;
        })}`;

        // To
        let to =
            gender === "male"
                ? `To,<br>Mr. ${upperName}`
                : `To,<br>Ms. ${upperName}`;

        // Subject
        let subject =
            internType === "internship"
                ? `Subject: Internship Offer Letter`
                : `Subject: ${internType.replace('_', ' ')} Job Offer Letter`;

        // Paragraphs
        let firstParagraph = `This letter is in reference to your application related to a request for a ${duration} ${durationType}${duration > 1 ? 's' : ''} ${internType} at our firm. We are pleased to inform you that you have been granted ${duration} ${durationType}${duration > 1 ? 's' : ''} at our company and your designation during the ${internType} shall be addressed as an ${role.toUpperCase()} at our company SAECULUM SOLUTIONS PVT LTD for this ${duration} ${durationType}${duration > 1 ? 's' : ''} period starting ${new Date(startDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).replace(/(\d+)/, (day) =>
            day + (
                day > 3 && day < 21
                    ? 'th'
                    : [
                        'th',
                        'st',
                        'nd',
                        'rd',
                        'th',
                        'th',
                        'th',
                        'th',
                        'th',
                        'th'
                    ][day % 10]
            )
        )}. Company shall inform your reporting manager at the time of joining. You are required to attend the office (for ${internType}) on all working days (Monday to Friday, except National holidays and company declared holidays) and your timings shall be from 10:00 AM to 7.00 PM (includes lunch break).`;

        let secondParagraph = `Your ${internType} tenure shall be from ${new Date(startDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).replace(/(\d+)/, (day) =>
            day + (
                day > 3 && day < 21
                    ? 'th'
                    : [
                        'th',
                        'st',
                        'nd',
                        'rd',
                        'th',
                        'th',
                        'th',
                        'th',
                        'th',
                        'th'
                    ][day % 10]
            )
        )} to ${new Date(endDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).replace(/(\d+)/, (day) =>
            day + (
                day > 3 && day < 21
                    ? 'th'
                    : [
                        'th',
                        'st',
                        'nd',
                        'rd',
                        'th',
                        'th',
                        'th',
                        'th',
                        'th',
                        'th'
                    ][day % 10]
            )
        )}. This association shall be considered as completed on ${new Date(endDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).replace(/(\d+)/, (day) =>
            day + (
                day > 3 && day < 21
                    ? 'th'
                    : [
                        'th',
                        'st',
                        'nd',
                        'rd',
                        'th',
                        'th',
                        'th',
                        'th',
                        'th',
                        'th'
                    ][day % 10]
            )
        )} or earlier, unless further extension is communicated in writing. Company shall not have any obligation to recruit you post cessation of your ${internType} association with the company.`;

        let salaryParagraph = "";

        if (salaryType === "paid") {

            salaryParagraph =
                `During the tenure of your ${internType}, you shall be paid a stipend/salary of ${salaryAmount} per month.`;

        } else {

            salaryParagraph =
                `This ${internType} shall be unpaid and no stipend/salary shall be provided during the tenure of your association with the company.`;
        }

        let thirdParagraph =
            `This ${internType} offer is subject to your acceptance to following terms (you joining the company shall mean and be interpreted as acceptance of following terms by you):`;

        let t1 =
            `1) Company, at its sole and exclusive discretion reserves the right to offer you further ${internType} and/or job offer, subject to complete satisfaction of your performance (Both technical as well as from HR perspective); however, in no way shall company be obligated to provide extension or any further job offer.`;

        let t2 =
            `2) During the above-mentioned ${internType} period, the company at its sole and exclusive discretion, reserves the right to immediately terminate the ${internType} of the candidate (yours), without assigning any reason thereof.`;

        let t3 =
            `3) This letter does not construe upon any appointment, offer, contract or any terms that may be associated with employment, labor laws or otherwise as the company has on pro-bono basis accepted to train you and provide a platform to conduct your ${internType} at company's premises. The intern shall adhere and follow the company's HR rule & regulations, code of conduct and other policies applicable in the office. The termination decision of the company shall be final and binding. Candidate (Trainee / Intern / you) hereby confirm and acknowledge that you have read all the above terms and conditions of the company and is deemed to be accepted by you and shall indemnify company under any obligation that may arise due to you joining our company as a Trainee/Intern, upon you joining the company under any capacity / designation. You further shall indemnify the company, its employees, its representatives, its consultants etc., but not limited to, in any matter of dispute and shall here further undertake not to undertake any legal actions, claim, recourse against the company in any manner related to this association, now and in future. Additionally, the company may require the intern to sign/execute an NDA for safeguarding the company and its clients' interests, to which intern shall agree.`;

        // HTML
        const html = `
<!DOCTYPE html>

<html>

<head>

<style>

*{
    margin:0;
    padding:0;
    box-sizing:border-box;
}

@page{
    size:A4;
    margin:0;
}

html{
    margin:0;
    padding:0;
}

body{

    font-family:Arial,sans-serif;

    margin:0;

    padding:0;

    color:#000;

    position:relative;
}

body::before{
    content:'';
    position:absolute;
    top:0;
    left:0;
    width:100%;
    height:100%;
    background-image:url('${templateUrl}');
    background-repeat:repeat-y;
    background-position:top left;
    background-size:262mm 375mm;
    z-index:-2;
}

body::after{
    content:'';
    position:absolute;
    top:0;
    left:0;
    width:100%;
    height:100%;
    background-image:url('${transparentUrl}');
    background-repeat:repeat-y;
    background-position:center center;
    background-size:262mm 375mm;
    z-index:-1;
}

/* Main content */
.content{
    padding:
        45mm
        25mm
        25mm
        25mm;

    font-size:13pt;
    line-height:1.7;
}

/* Prevent paragraph breaking */
p{
    text-align:justify;
    margin-bottom:7mm;

    page-break-inside: avoid;

    break-inside: avoid;

    display:block;
}

/* Prevent div breaking */
div{
    page-break-inside: avoid;

    break-inside: avoid;
}

.paragraph-block{

    page-break-inside: avoid;

    break-inside: avoid;

    margin-bottom:7mm;
}

.date{
    text-align:right;
    margin-bottom:15mm;
}

.subject{
    text-align:center;
    font-weight:bold;
    margin-top:10mm;
    margin-bottom:10mm;
}

.sign{
    width:40mm;
    margin-top:10mm;

    page-break-inside: avoid;
}

.center{
    text-align:center;
}

</style>

</head>

<body>

<div class="content">

    <div class="date">
        ${inpDate}
    </div>

    <div>
        ${to}
    </div>

    <div class="subject">
        ${subject}
    </div>

    <div class="paragraph-block">
        <p>${firstParagraph}</p>
    </div>

    <div class="paragraph-block">
        <p>${secondParagraph}</p>
    </div>

    <div class="paragraph-block">
        <p>${salaryParagraph}</p>
    </div>

    <div class="paragraph-block">
        <p>${thirdParagraph}</p>
    </div>

    <div class="paragraph-block">
        <p>${t1}</p>
    </div>

    <div class="paragraph-block">
        <p>${t2}</p>
    </div>

    <div class="paragraph-block">
        <p>${t3}</p>
    </div>

    <br><br>

    <div>

        Sincerely,
        <br>

        HARDIKKUMAR VINZAVA
        <br>

        DIRECTOR

    </div>

    <img
        src="${signUrl}"
        class="sign"
    />

    <div style="margin-top:10mm;">
        SAECULUM SOLUTIONS PVT LTD
    </div>

    <div
        class="center"
        style="
            margin-top:10mm;
            margin-bottom:10mm;
        "
    >
        --------------------------------X----------------------------X-----------------------
    </div>

    <div class="paragraph-block">

        <p>
            I, ${upperName},
            hereby accept the above-mentioned Internship offer alongwith the terms mentioned therein and acknowledge receiving a copy of the same.
        </p>

    </div>

    <div style="margin-top:10mm;">

        Signature_____________________

        <br><br>

        Name of the Trainee Accepting offer:
        ${upperName}

        <br><br>

        Place of sole & exclusive Jurisdiction:
        Ahmedabad, Gujarat, India

    </div>

</div>

</body>

</html>
`;

        // Generate PDF
        wkhtml(html, {

            output: outputFile,

            enableLocalFileAccess: true,

            pageSize: 'A4',

            marginTop: '0',

            marginBottom: '0',

            marginLeft: '0',

            marginRight: '0'

        }, function (err) {

            if (err) {

                console.log(err);

                return res.status(500).json({
                    error: 'PDF generation failed'
                });
            }

            console.log(
                `PDF generated: ${outputFile}`
            );

            res.status(200).json({

                message:
                    `Offer letter generated successfully`,

                path:
                    `http://localhost:5000/GeneratedOfferLetter/${fileName}`
            });

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

export default {
    generateOfferLetter
};