// costs-service/test.js

async function testServer() {
    const url = 'http://localhost:3002/api';

    console.log('--- 1. Adding a cost in the PAST (2023) ---');
    // אנחנו יוצרים הוצאה בכוונה בתאריך ישן כדי לבדוק שהמערכת שומרת את הדוח
    try {
        const response = await fetch(`${url}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userid: 123123,
                description: "Old Pizza",
                sum: 25,
                category: "food",
                created_at: "2023-05-10" // תאריך בעבר
            })
        });
        console.log('Add Cost Status:', response.status);
    } catch (error) { console.error(error); }

    console.log('\n--- 2. Getting Report for 05/2023 (First Time - Should Compute & Save) ---');
    try {
        const response = await fetch(`${url}/report?id=123123&year=2023&month=5`);
        const data = await response.json();
        console.log('Report 1 Status:', response.status);
    } catch (error) { console.error(error); }

    console.log('\n--- 3. Getting Report for 05/2023 (Second Time - Should be FAST from Cache) ---');
    // כאן אנחנו מצפים שבמסוף של השרת (הטרמינל השני) נראה הודעה "Returning cached report"
    try {
        const response = await fetch(`${url}/report?id=123123&year=2023&month=5`);
        const data = await response.json();
        console.log('Report 2 Status:', response.status);
        console.log('Check the server terminal log for "Returning cached report"!');
    } catch (error) { console.error(error); }
}

testServer();