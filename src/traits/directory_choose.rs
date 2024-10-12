pub trait DirectoryChoose {
    fn get_dir_path(&self) -> &str;
    fn set_dir_path(&mut self, path: &str);
}

#[macro_export]
macro_rules! additional_directory {
    ($directory_path:ident) => {
        impl DirectoryChoose for $directory_path{
            fn get_dir_path(&self) -> &str{
                &self.dir_path
            }
            fn set_dir_path(& mut self, path:&str) {
                self.dir_path = path.to_string();
            }
        }
    };
}