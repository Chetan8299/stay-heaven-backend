import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { Hotel } from "../models/hotel.model.js";
import { io } from "../app.js";
import { User } from "../models/user.model.js";
import { Issue } from "../models/issue.model.js";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
let userId;
async function check_hotel(name) {
    try {
        const sanitizedName = name.replace(/hotel/i, "").trim();

        const hotels = await Hotel.find({
            title: { $regex: sanitizedName, $options: "i" },
        });
        if (hotels.length > 0) {
            const hotelList = hotels
                ?.map(
                    (hotel) =>
                        `${hotel.title}, max guests:${hotel.maxGuests}, city: ${hotel.city}, hotel id: ${hotel._id}`
                )
                ?.join("\n");
            return `Found hotels: ${hotelList}`;
        }
        return "No hotels found";
    } catch (error) {
        console.error("Error checking hotel availability:", error);
        throw new Error("An error occurred while checking hotel availability.");
    }
}

async function getdate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

async function book_hotel(
    id,
    name,
    checkindate,
    checkoutdate,
    guestnumber,
    guestdetails,
    rooms
) {
    io.emit("call_from_chatbot", {
        id,
        name,
        checkindate,
        checkoutdate,
        guestnumber,
        guestdetails,
        rooms,
    });
    return "Please retry if payment gateway is not working";
}

async function previous_booking() {
    const user = await User.findById(userId).populate("previousBookings");
    if (!user) {
        throw new Error("Unauthorized request");
    }
    const res = user.previousBookings.toString();
    return res;
}

async function file_issue(category, description) {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error("Unauthorized request");
    }

    function capitalizeWords(sentence) {
        if (!sentence) return "";
        return sentence
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }
    const issue = await Issue.create({
        user: user._id,
        category: capitalizeWords(category),
        description,
    });
    await User.findByIdAndUpdate(userId, {
        $push: {
            issues: issue._id,
        },
    });
    return "Issue file successfully";
}

async function get_issues() {
    const user = await User.findById(userId).populate("issues");
    if (!user) {
        throw new Error("Unauthorized request");
    }
    const res = user.issues.toString();
    return res;
}

async function search_hotel(
    wifi,
    ac,
    breakfast,
    parking,
    kitchen,
    gym,
    searchterm,
    min_price = 0,
    max_price = 50000,
    rating,
    rating_order
) {
    let baseQuery = null;
    if (searchterm) {
        baseQuery = {
            $or: [
                { title: { $regex: new RegExp(searchterm, "i") } },
                { city: { $regex: new RegExp(`\\b${searchterm}\\b`, "i") } },
                { state: { $regex: new RegExp(`\\b${searchterm}\\b`, "i") } },
            ],
        };
    }

    const additionalQueries = [];

    if (wifi) {
        additionalQueries.push({ facilities: { $regex: /wifi/i } });
    }
    if (ac) {
        additionalQueries.push({ facilities: { $regex: /ac/i } });
    }
    if (breakfast) {
        additionalQueries.push({ facilities: { $regex: /breakfast/i } });
    }
    if (parking) {
        additionalQueries.push({ facilities: { $regex: /parking/i } });
    }
    if (kitchen) {
        additionalQueries.push({ facilities: { $regex: /kitchen/i } });
    }
    if (gym) {
        additionalQueries.push({ facilities: { $regex: /gym/i } });
    }
    if (rating_order && rating) {
        if (rating_order === "greater") {
            additionalQueries.push({ rating: { $gt: rating } });
        } else if (rating_order === "equal") {
            additionalQueries.push({ rating: { $eq: rating } });
        } else if (rating_order === "less") {
            additionalQueries.push({ rating: { $lt: rating } });
        } else if (rating_order === "lessequal") {
            additionalQueries.push({ rating: { $lte: rating } });
        } else if (rating_order === "greaterequal") {
            additionalQueries.push({ rating: { $gte: rating } });
        }
    }

    additionalQueries.push({ approvalStatus: "approved" });

    const priceQuery = {};
    if (min_price) priceQuery.$gte = min_price;
    if (max_price) priceQuery.$lte = max_price;
    additionalQueries.push({ price: priceQuery });

    let finalQuery;
    if (additionalQueries.length > 0 && baseQuery) {
        finalQuery = { $and: [baseQuery, ...additionalQueries] };
    } else if (additionalQueries.length > 0) {
        finalQuery = { $and: [...additionalQueries] };
    } else if (baseQuery) {
        finalQuery = baseQuery;
    }

    let hotels;
    hotels = await Hotel.find(finalQuery ? finalQuery : null);
    const res = hotels.toString();
    return res;
}
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: `
  1. Hotel Booking

    Initiate Booking:
    If a user wants to book a hotel, start by calling the check_hotel function with the provided hotel name. This function will:

    Give an array of hotels with name , city, hotel id and max guests allowed in a single room.
    If hotels array is empty or undefined then return "No hotels found" then respond with this message only. 
    if multiple hotels are there in array then ask the user which hotel they want to book bye sending the list of hotels (don't show id to user).

    Gather Booking Details:
    Check-In and Check-Out Dates:
    Ask the user to provide check-in and check-out dates.
    Call "getdate" function to get current date in dd/mm//yyyy format.

    Validate the dates by:
    Ensuring the check-in date is later than the current date.
    Ensuring the check-out date is later than the check-in date.
    If the dates are invalid, prompt the user to enter valid dates with specific guidance:
    If the check-in date is in the past, request a future date.
    If the check-in date is later than the check-out date, ask for a correct check-in date.

    Guest Information:
    Ask the user for the number of guests, along with their full names and phone numbers.
    Ensure that phone numbers are unique for all guests and are of 10 digits.

    Room Requirements:
    Ask for the number of rooms required.

    Validate the room count:
    The number of rooms must be at least the ceiling value of (guest count divided by max guests per room).
    If the room count is greater than the ceiling value, then it is all right to move forward with the booking.
    If the room count is insufficient, prompt the user to enter a valid number of rooms.

    Confirm and Book:
    Confirm details from user. If user says yes then only Call the book_hotel function with all the parameters.
    The function will return the booking status:
    If successful, share the booking confirmation message with the user.
    If unsuccessful, inform the user about the issue.

  2. View Previous Bookings

    If the user wants to see their past bookings, call the previous_booking function.
    Display only:
    Hotel name.
    Check-in and check-out dates only in readable format.
    If the user requests more details about a specific booking, display additional information like descriptions or other booking-specific details.
   
  3. File a complaint
  
    If the user wants to file a complaint/Issue, tell him to select the complaint category from the given options - Booking Related, Payment Issues, Amenities, cleanliness, Customer Service, other.
    Then ask him to provide a detailed description of the issue.
    then call the file_issue function with all the parameters.
  
  4. Get all issues
  
    if the user wants to see all the issues, call the get_issues function and display all the issue details.

  5. Search/Find Hotels

    If the user wants to search for a hotel, call the search_hotel function with the following parameters:
    wifi: boolean
    ac: boolean
    breakfast: boolean
    parking: boolean
    kitchen: boolean
    gym: boolean
    searchterm: string - can be city, state, title.
    min_price: number
    max_price: number
    rating: number
    rating_order: string
    if user asks the hotel with the rating above a particular rating then provide "greater" in rating_order.
    if user asks the hotel with the rating exactly equal to a particular rating then provide "equal" in rating_order.
    if user asks the hotel with the rating below a particular rating then provide "less" in rating_order.
    if user asks the hotel with the rating less than or equal to a particular rating then provide "lessequal" in rating_order.
    if user asks the hotel with the rating greater than or equal to a particular rating then provide "greaterequal" in rating_order.
    If user dont give min price and max price, then keep min price as 0 and max price as 50000.
    if user dont mention any of the parameters, then keep them as false.
    dont return more than 5 hotels at a time.

  6. General Guidelines
    Provide a friendly and professional tone throughout the interaction.
    Ensure all validations and requirements are clearly explained to the user for a seamless experience.
    If asked to do anything else other than the above-mentioned tasks, respond with appropriate message that I can't help you with this.
    give me the response in normal text format no need to use mdx format.
    Always respond with a message that is easy to understand and user-friendly and do not include any technical details in the response.
    Don't tell the user about the internal details like api, database, json, etc. Simply tell them the information you are having access of.
  `,

    tools: [
        {
            functionDeclarations: [
                {
                    name: "check_hotel",
                    description: "tells whether hotel is available or not",
                    parameters: {
                        type: "object",
                        properties: {
                            // book taj hotel -> check_hotel("taj")
                            name: {
                                type: "string",
                            },
                        },
                    },
                },
                {
                    name: "getdate",
                    description: "return current date",
                },
                {
                    name: "book_hotel",
                    description: "books the hotel",
                    parameters: {
                        type: "object",
                        properties: {
                            name: {
                                type: "string",
                            },
                            checkinDate: {
                                type: "string",
                            },
                            checkoutDate: {
                                type: "string",
                            },
                            guestNumber: {
                                type: "integer",
                            },
                            guestDetails: {
                                type: "object",
                                properties: {
                                    name: {
                                        type: "string",
                                    },
                                    phoneNumber: {
                                        type: "string",
                                    },
                                },
                            },
                            "rooms ": {
                                type: "number",
                            },
                            id: {
                                type: "string",
                            },
                        },
                    },
                },
                {
                    name: "previous_booking",
                    description: "returns previous bookings",
                },
                {
                    name: "file_issue",
                    description: "files an issue/complaint",
                    parameters: {
                        type: "object",
                        properties: {
                            // book taj hotel -> check_hotel("taj")
                            category: {
                                type: "string",
                            },
                            description: {
                                type: "string",
                            },
                        },
                    },
                },
                {
                    name: "search_hotel",
                    description: "returns all the hotels",
                    parameters: {
                        type: "object",
                        properties: {
                            wifi: {
                                type: "boolean",
                            },
                            ac: {
                                type: "boolean",
                            },
                            breakfast: {
                                type: "boolean",
                            },
                            parking: {
                                type: "boolean",
                            },
                            kitchen: {
                                type: "boolean",
                            },
                            gym: {
                                type: "boolean",
                            },
                            searchterm: {
                                type: "string",
                            },
                            min_price: {
                                type: "number",
                            },
                            max_price: {
                                type: "number",
                            },
                            rating: {
                                type: "number",
                            },
                            rating_order: {
                                type: "string",
                            },
                        },
                    },
                },
            ],
        },
    ],
    // toolConfig: {functionCallingConfig: {mode: "ANY"}},
});

const generationConfig = {
    temperature: 2,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

let history = [];
async function run(userInput) {
    //  history.push({ role: "user", parts: [{ text: userInput }] });
    let ans = "";

    const chatSession = model.startChat({
        generationConfig,
        history: history,
    });

    const result = await chatSession.sendMessage(userInput);

    if (result.response?.candidates?.length > 0) {
        const candidate = result.response.candidates[0];
        ans = candidate.content.parts[0].text;
        // history.push({
        //   role: "model",
        //   parts: [{ text: candidate.content.parts[0].text }],
        // });

        for (const part of candidate.content.parts) {
            if (part.functionCall) {
                const { name: functionName, args } = part.functionCall;
                try {
                    let response;
                    if (functionName === "check_hotel") {
                        response = await check_hotel(args.name);
                    } else if (functionName === "getdate") {
                        response = await getdate();
                    } else if (functionName === "book_hotel") {
                        const {
                            id,
                            name,
                            checkinDate: checkinDate,
                            checkoutDate: checkoutDate,
                            guestNumber: guestNumber,
                            guestDetails: guestDetails,
                            rooms,
                        } = args;
                        response = await book_hotel(
                            id,
                            name,
                            checkinDate,
                            checkoutDate,
                            guestNumber,
                            guestDetails,
                            rooms
                        );
                    } else if (functionName === "previous_booking") {
                        response = await previous_booking();
                    } else if (functionName === "file_issue") {
                        const { category, description } = args;
                        response = await file_issue(category, description);
                    } else if (functionName === "get_issues") {
                        response = await get_issues();
                    } else if (functionName === "search_hotel") {
                        const {
                            wifi,
                            ac,
                            breakfast,
                            parking,
                            kitchen,
                            gym,
                            searchterm,
                            min_price,
                            max_price,
                            rating,
                            rating_order,
                        } = args;
                        response = await search_hotel(
                            wifi,
                            ac,
                            breakfast,
                            parking,
                            kitchen,
                            gym,
                            searchterm,
                            min_price,
                            max_price,
                            rating,
                            rating_order
                        );
                    } else {
                        response = "Unknown function call.";
                    }

                    // Adding function response to history
                    const functionResponseParts = [
                        {
                            functionResponse: {
                                name: functionName,
                                response: { result: response.toString() },
                            },
                        },
                    ];

                    // Err : content with role "user" can't contain functionResponse part
                    history.push({
                        role: "function",
                        parts: functionResponseParts,
                    });

                    try {
                        const updatedChatSession = model.startChat({
                            generationConfig,
                            history,
                        });
                        const updatedResult =
                            await updatedChatSession.sendMessage(response);

                        // model's response
                        ans =
                            updatedResult.response.candidates[0].content
                                .parts[0].text;
                        // history.push({
                        //   role: "model",
                        //   parts: updatedResult.response.candidates[0].content.parts
                        // });
                    } catch (error) {
                        console.log("mai ERRRR HU", error);
                    }
                } catch (error) {
                    console.error(
                        `ERRRRRRRRR in function ${functionName}:`,
                        error.message
                    );
                }
            }
        }
        return ans;
    }
}

export async function chatbot(userInput, id) {
    userId = id;
    let ans = await run(userInput);
    return ans;
}
