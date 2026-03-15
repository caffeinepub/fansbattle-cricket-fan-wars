import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Access control state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // UserProfile type required by frontend
  public type UserProfile = {
    userId : Text;
    username : ?Text;
    mobileNumber : Text;
    coins : Nat;
    favoriteTeam : ?Text;
    level : Nat;
    joinDate : Time.Time;
    avatar : Text;
  };

  // Map Principal to UserProfile
  let users = Map.empty<Principal, UserProfile>();
  var nextUserId : Nat = 1;

  // Map mobile number to Principal for lookup
  let mobileNumbers = Map.empty<Text, Principal>();

  // Required by frontend: Get caller's own profile
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    users.get(caller);
  };

  // Required by frontend: Save caller's own profile
  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    users.add(caller, profile);
  };

  // Required by frontend: Get any user's profile (with authorization)
  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    users.get(user);
  };

  // Create a new user - authenticated users only
  public shared ({ caller }) func createUser(mobileNumber : Text) : async {
    userId : Text;
    coins : Nat;
    level : Nat;
    joinDate : Time.Time;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can create profiles");
    };

    // Check if user already exists
    switch (users.get(caller)) {
      case (?_) { Runtime.trap("User already exists") };
      case null {};
    };

    // Check if mobile number is already registered
    switch (mobileNumbers.get(mobileNumber)) {
      case (?_) { Runtime.trap("Mobile number already registered") };
      case null {};
    };

    let userId = nextUserId.toText();
    let newUser : UserProfile = {
      userId;
      username = null;
      mobileNumber;
      coins = 100;
      favoriteTeam = null;
      level = 1;
      joinDate = Time.now();
      avatar = "";
    };
    users.add(caller, newUser);
    mobileNumbers.add(mobileNumber, caller);
    nextUserId += 1;

    { userId; coins = 100; level = 1; joinDate = newUser.joinDate };
  };

  // Get user profile - users can view their own, admins can view any
  public query ({ caller }) func getUser(userPrincipal : Principal) : async UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view profiles");
    };

    if (caller != userPrincipal and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };

    switch (users.get(userPrincipal)) {
      case (null) { Runtime.trap("User not found") };
      case (?user) { user };
    };
  };

  // Update user profile - users can update their own, admins can update any
  public shared ({ caller }) func updateUserProfile(
    userPrincipal : Principal,
    username : ?Text,
    favoriteTeam : ?Text,
    avatar : Text
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can update profiles");
    };

    if (caller != userPrincipal and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only update your own profile");
    };

    let user = switch (users.get(userPrincipal)) {
      case (null) { Runtime.trap("User not found") };
      case (?user) { user };
    };

    let updatedUser = {
      user with
      username = switch (username) {
        case (null) { user.username };
        case (?name) { ?name };
      };
      favoriteTeam = switch (favoriteTeam) {
        case (null) { user.favoriteTeam };
        case (?team) { ?team };
      };
      avatar;
    };
    users.add(userPrincipal, updatedUser);
  };

  // Check if user profile is complete - users can check their own, admins can check any
  public query ({ caller }) func isProfileComplete(userPrincipal : Principal) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can check profile status");
    };

    if (caller != userPrincipal and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only check your own profile");
    };

    let user = switch (users.get(userPrincipal)) {
      case (null) { Runtime.trap("User not found") };
      case (?user) { user };
    };
    (user.username != null) and (user.favoriteTeam != null);
  };

  // Get user's coin balance - users can view their own, admins can view any
  public query ({ caller }) func getUserCoins(userPrincipal : Principal) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view coin balance");
    };

    if (caller != userPrincipal and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own coin balance");
    };

    let user = switch (users.get(userPrincipal)) {
      case (null) { Runtime.trap("User not found") };
      case (?user) { user };
    };
    user.coins;
  };

  // Add coins to user - admin only
  public shared ({ caller }) func addCoins(userPrincipal : Principal, amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add coins");
    };

    let user = switch (users.get(userPrincipal)) {
      case (null) { Runtime.trap("User not found") };
      case (?user) { user };
    };
    let updatedUser = { user with coins = user.coins + amount };
    users.add(userPrincipal, updatedUser);
  };

  // Get all users - accessible to all authenticated users (for leaderboard)
  public query ({ caller }) func getAllUsers() : async [UserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view leaderboard");
    };
    users.values().toArray();
  };

  // Find user by mobile number - admin only (sensitive data)
  public query ({ caller }) func findUserByMobileNumber(mobileNumber : Text) : async Principal {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can search by mobile number");
    };

    switch (mobileNumbers.get(mobileNumber)) {
      case (null) { Runtime.trap("User not found") };
      case (?userPrincipal) { userPrincipal };
    };
  };
};
