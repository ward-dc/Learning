import { useEffect, useReducer, useRef, useState } from "react";
import CamSpace from "../components/chatroom/CamSpace";
import ChatSpace from "../components/chatroom/ChatSpace";
import TextBoxSpace from "../components/chatroom/TextBoxSpace";
import webSocket from "../components/websocket/websocket";
const Chat = () => {
  const [searching, setSearching] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketCon = webSocket();

  const [socket, setSocket] = useState();

  const input = useRef();
  const [messages, dispatch] = useReducer((state, action) => {
    if (action.message) action.message.id = state.length + 1;
    switch (action.type) {
      case "SEND_MESSAGE":
        socket.emit("message", action.message.content);
        return [...state, action.message];

      case "RECEIVE_MESSAGE":
        return [...state, action.message];
      case "RESET_MESSAGES":
        return [];
      default:
        new Error("Unknown action type");
        return state;
    }
  }, []);

  useEffect(() => {
    if (socketCon) {
      socketCon.on("connect", () => {
        setSearching(true);
        console.log("SOCKET CONNECTED!", socketCon.id);
        setSocket(socketCon);
      });
      socketCon.on("disconnect", () => {
        stopChat();
        console.log("SOCKET Disconnected!", socketCon.id);
        setSocket(socketCon);
      });
      socketCon.on("found_stranger", () => {
        setSearching(false);
        setConnected(true);
        input.current?.focus();
      });
      socketCon.on("room_ended", () => {
        setConnected(false);
        setSearching(false);
        dispatch({ type: "RESET_MESSAGES" });
      });
      socketCon.on("message", (message) => {
        dispatch({ type: "RECEIVE_MESSAGE", message });
      });
    }
  }, [socketCon]);

  String.prototype.replaceAll = function (str1, str2, ignore) {
    return this.replace(
      new RegExp(
        str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g, "\\$&"),
        ignore ? "gi" : "g"
      ),
      typeof str2 == "string" ? str2.replace(/\$/g, "$$$$") : str2
    );
  };

  function sendMessage() {
    let content = input.current.value;
    if (socket?.connected && content.replaceAll(" ", "") != "") {
      dispatch({
        type: "SEND_MESSAGE",
        message: { sender: null, content: content },
      });
      input.current.value = "";
      return true;
    }
    return false;
  }

  async function stopChat() {
    setConnected(false);
    setSearching(false);
    dispatch({ type: "RESET_MESSAGES" });
    socketCon.emit("leave_room");
  }

  async function searchRoom() {
    console.log("searching");
    setSearching(true);
    socketCon.emit("find_room");
  }

  return (
    <div class="flex flex-col flex-auto absolute bottom-0 top-20 flex-grow m-2 right-0 left-0 p-4">
      <div class="flex flex-col flex-auto flex-shrink-0 rounded-2xl bg-gray-100 h-full p-4">
        <ChatSpace
          messages={messages}
          searching={searching}
          connected={connected}
        ></ChatSpace>
        <TextBoxSpace
          sendMessage={sendMessage}
          stop={stopChat}
          search={searchRoom}
          searching={searching}
          connected={connected}
        >
          <input
            type="text"
            class="flex w-full border rounded-xl focus:outline-none focus:border-indigo-300 pl-4 pr-10 h-10"
            disabled={!socket?.connected}
            ref={input}
            onKeyDown={(e) => {
              if (e.key == "Enter") {
                sendMessage();
              }
            }}
            disabled={!connected}
          />
        </TextBoxSpace>
      </div>
    </div>
  );
};

export default Chat;
