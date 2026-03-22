import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  type OldUserProfile = {
    userId : Text;
    username : ?Text;
    mobileNumber : Text;
    coins : Nat;
    favoriteTeam : ?Text;
    level : Nat;
    joinDate : Time.Time;
    avatar : Text;
  };

  type OldActor = {
    users : Map.Map<Principal, OldUserProfile>;
    mobileNumbers : Map.Map<Text, Principal>;
    nextUserId : Nat;
  };

  type NewUserProfile = OldUserProfile;

  type NewActor = {
    users : Map.Map<Principal, NewUserProfile>;
    mobileNumbers : Map.Map<Text, Principal>;
    nextUserId : Nat;
    lastApiResponse : Text;
    lastApiCallTime : Time.Time;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      lastApiResponse = "";
      lastApiCallTime = 0;
    };
  };
};
