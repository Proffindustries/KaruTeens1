pub mod base;
pub mod user;
pub mod content;
pub mod comments;
pub mod messaging;
pub mod payments;
pub mod marketplace;
pub mod events;
pub mod ads;
pub mod social;
pub mod academic;
pub mod pages;
pub mod media;

// Re-export core models for convenience (maintains backward compatibility)
pub use base::*;
pub use user::*;
pub use content::*;
pub use comments::*;
pub use messaging::*;
pub use payments::*;
pub use marketplace::*;
pub use events::*;
pub use ads::*;
pub use pages::*;
pub use media::*;

// Explicit re-exports for structured modules
pub mod stories {
    
}

pub mod reels {
    
}

pub mod hookup {
    
}

pub mod groups {
    
}

pub mod study {
    
}

// Global re-exports for commonly used items that were in the top-level previously
pub use social::{
    Story, StoryView, StoryReply,
    StoryReport, StoryModeration, StorySchedule, StoryTemplate,
    UserStoryStats,
    Reel, ReelView, ReelLike, ReelComment, ReelShare, ReelDuet, ReelStitch, 
    ReelSave, ReelAnalytics, UserReelStats, ReelReport, ReelModeration, 
    ReelTranscodingJob,
    Subtitle, Caption,
    Group, GroupPost, HookupAlias, HookupMatch, Follow
};

pub use academic::{StudyRoom, Timetable, TimetableClass, RevisionMaterial, RevisionMaterialPurchase, StudyPlaylist, PlaylistItem, RoomMessage, RoomFile, PhysicalRoom, RoomBooking, AttendanceLog, CrowdReport};

// Re-export commonly used types
