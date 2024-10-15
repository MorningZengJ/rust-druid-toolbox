use crate::controller::controllers::Controllers;
use druid::{Cursor, Env, EventCtx};

pub struct MouseController;

impl MouseController {
    pub fn mouse_cursor_pointer<T>() -> Controllers<T, fn(&mut EventCtx, &mut T, &Env)> {
        Controllers {
            mouse_move: Some(|ctx: &mut EventCtx, data: &mut T, _env: &Env| {
                ctx.set_cursor(&Cursor::Pointer)
            }),
            mouse_dblclick: None,
            command: None,
            _marker: Default::default(),
        }
    }
}