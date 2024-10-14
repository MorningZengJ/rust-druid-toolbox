pub trait DirectoryChoose {
    fn get_dir_path(&self) -> &str;
    fn set_dir_path(&mut self, path: &str);
}
