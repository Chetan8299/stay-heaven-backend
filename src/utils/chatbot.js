import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { Hotel } from "../models/hotel.model.js";
import { io } from "../app.js";
dotenv.config();


const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function check_hotel(name) {
  try {
    const sanitizedName = name.replace(/hotel/i, "").trim();

    const hotels = await Hotel.find({ title: { $regex: sanitizedName, $options: "i" } });
    console.log(hotels)
    if(hotels.length > 0) {
      const hotelList = hotels?.map((hotel) => `${hotel.title}, max guests:${hotel.maxGuests}, city: ${hotel.city}, hotel id: ${hotel._id}`)?.join("\n");
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
  console.log("call from bot", id, name, checkindate, checkoutdate, guestnumber, guestdetails, rooms);
  io.emit("call_from_chatbot", { id, name, checkindate, checkoutdate, guestnumber, guestdetails, rooms });
  return "Please retry if payment gateway is not working";
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
    The number of rooms must be at least the ceiling value of (guest count รท max guests per room).
    If the room count is insufficient, prompt the user to enter a valid number of rooms.

    Confirm and Book:
    Confirm details from user. If user says yes then only Call the book_hotel function with all the parameters.
    The function will return the booking status:
    If successful, share the booking confirmation message with the user.
    If unsuccessful, inform the user about the issue.

  2. View Previous Bookings

    If the user wants to see their past bookings, call the previous_booking function.
    Display a summary of their bookings, including:
    Hotel name.
    Check-in and check-out dates.
    If the user requests more details about a specific booking, display additional information like descriptions or other booking-specific details.
    
  3. General Guidelines
    Provide a friendly and professional tone throughout the interaction.
    Ensure all validations and requirements are clearly explained to the user for a seamless experience.
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
              "checkinDate": {
                type: "string",
              },
              "checkoutDate": {
                type: "string",
              },
              "guestNumber": {
                type: "integer",
              },
              "guestDetails": {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                  },
                  "phoneNumber": {
                    type: "string",
                  },
                },
              },
              "rooms ": {
                type: "number",
              },
              "id": {
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
              "checkinDate": checkinDate,
              "checkoutDate": checkoutDate,
              "guestNumber": guestNumber,
              "guestDetails": guestDetails,
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
          } else {
            response = "Unknown function call.";
          }

          // Adding function response to history
          const functionResponseParts = [{
            functionResponse: {
              name: functionName,
              response: { result: response.toString() },
            },
          }];
          
          // Err : content with role "user" can't contain functionResponse part
          history.push({ role: "function", parts: functionResponseParts });

          

          try {
            const updatedChatSession = model.startChat({
              generationConfig,
              history,
            });
            const updatedResult = await updatedChatSession.sendMessage(
              response
            );


            // model's response
            ans = updatedResult.response.candidates[0].content.parts[0].text;
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

export async function chatbot(userInput) {
    let ans = await run(userInput);
    return ans;
}