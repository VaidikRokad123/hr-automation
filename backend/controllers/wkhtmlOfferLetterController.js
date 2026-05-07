import wkhtml from 'wkhtmltopdf';
import path from 'path';
import fs from 'fs';

// VERY IMPORTANT
wkhtml.command = 'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe';

const pdfPath = "../backend/GeneratedOfferLetter";
const imagePath = "./public/images/offerletter/";

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

        // Validate required fields
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
        const folderPath = path.join(process.cwd(), pdfPath);

        // Create folder if not exists
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
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

        // HTML
        const html = `
            <!DOCTYPE html>
            <html>

                <head>

                    <style>

                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }

                        @page {
                            size: A4;
                            margin: 0;
                        }

                        html, body {
                            width: 210mm;
                            height: 297mm;
                            margin: 0;
                            padding: 0;
                            font-family: Arial, sans-serif;
                            position: relative;
                        }

                        .page {
                            width: 210mm;
                            height: 297mm;
                            position: relative;
                            page-break-after: always;
                        }

                        .bg {
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 210mm;
                            height: 297mm;
                            z-index: -2;
                            object-fit: cover;
                        }

                        .watermark {
                            position: absolute;
                            top: 55mm;
                            left: 7mm;
                            width: 200mm;
                            height: 200mm;
                            opacity: 0.1;
                            z-index: -1;
                            object-fit: contain;
                        }

                        .content {
                            position: relative;
                            padding: 45mm 25mm;
                            z-index: 1;
                        }

                        .sign {
                            width: 40mm;
                            height: 20mm;
                            margin-top: 15mm;
                            object-fit: contain;
                        }

                    </style>

                </head>

                <body>

                    <div class="page">

                        <!-- Background Template -->
                        <img
                            src="${templateUrl}"
                            class="bg"
                        />

                        <!-- Watermark -->
                        <img
                            src="${transparentUrl}"
                            class="watermark"
                        />

                        <div class="content">

                            <h1>${upperName}</h1>

                            <p>
                                Role: ${role}
                            </p>

                            <p>
                                Intern Type: ${internType}
                            </p>

                            <!-- Signature -->
                            <img
                                src="${signUrl}"
                                class="sign"
                            />

                        </div>

                    </div>

                </body>

            </html>
        `;

        // Generate PDF
        wkhtml(html, {

            output: outputFile,

            enableLocalFileAccess: true

        }, function (err) {

            if (err) {

                console.log(err);

                return res.status(500).json({
                    error: 'PDF generation failed'
                });
            }

            console.log(`PDF generated: ${outputFile}`);

            res.status(200).json({
                message: `Offer letter generated successfully`,
                path: `http://localhost:5000/GeneratedOfferLetter/${fileName}`
            });

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

export default { generateOfferLetter };